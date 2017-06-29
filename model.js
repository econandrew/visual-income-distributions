//import * as distributions from 'distributions';

function PCN3toISO3(code) {
    switch (code) {
    case "KSV":
        return "XKX";
    case "TMP":
        return "TLS";
    case "WBG":
        return "PSE";
    case "ZAR":
        return "COD";
    default:
        return code;
    }
}

const mapCoverage = {
    U: "urban",
    R: "rural",
    N: "national"
}

const mapMeasure = {
    Income: "income",
    Consumption: "consumption"
}

class AllDistributions {
    constructor(distributions, populations, populationsUrban, populationsRural, fce, gdp) {
        // These all have the structure iso3c => year => data point
        this.countries =  AllDistributions.buildCountries(populations);
        this.populations = {
            national: AllDistributions.buildWDIcsv(populations),
            urban:    AllDistributions.buildWDIcsv(populationsUrban),
            rural:    AllDistributions.buildWDIcsv(populationsRural)
        };
        this.fce = AllDistributions.buildWDIcsv(fce);
        this.gdp = AllDistributions.buildWDIcsv(gdp);
        
        const divide = (a, b) => (a / b);
        
        this.fcePerCapita = AllDistributions.countryYearMap(this.fce, this.populations.national, divide);
        this.gdpPerCapita = AllDistributions.countryYearMap(this.gdp, this.populations.national, divide);

        // This has the structure iso3c => {national, rural, urban} => {consumption, income} => distribution
        this.distributions = AllDistributions.buildDistributions(distributions, this.populations);
        
        this.interpolateDistributions();
        this.extrapolateDistributions("fcePerCapita");
        this.extrapolateDistributions("gdpPerCapita");
        this.combineRuralUrbanDistributions();
    }
    
    static buildCountries(data = []) {
        const out = new Map();
        data.forEach(function (d) {
            const code = d['Country Code'];
            const countryName = d['Country Name'];
            
            out.set(code, countryName);
        });
        return out;        
    }
    
    static buildWDIcsv(data = []) {
        const out = new Map();
        data.forEach(function (d) {
            const code = d['Country Code'];
            
            if (!out.has(code))
                out.set(code, new Map());
        
            for (var year = 1960; year <= 2015; year++)
                out.get(code).set(year, d[year] !== '' ? +d[year] : null);
        });
        return out;        
    }
    
    static countryYearMap(a, b, f) {
        const out = new Map();
        a.forEach((years, code) => {
            years.forEach((value, year) => {
                if (b.has(code) && b.get(code).has(year)) {
                    let val_a = value;
                    let val_b = b.get(code).get(year);
                    
                    if (val_a !== null && val_b !== null) {
                        let val_new = f(val_a, val_b);
                    
                        if (!out.has(code))
                            out.set(code, new Map());
                    
                        out.get(code).set(year, val_new);
                    }
                } 
            }); 
        });
        return out;
    }
    
    static buildDistributions(data, populations) {
        const out = new Map();

        data.forEach(function (d) {
            const code = PCN3toISO3(d.iso3c);
            const coverage = mapCoverage[d.source.substring(4,5)];
            const measure = mapMeasure[d.measure];            

            if (!out.has(code)) {
                out.set(code, {
                    national: {consumption: new Map(), income: new Map()},
                    rural:    {consumption: new Map(), income: new Map()},
                    urban:    {consumption: new Map(), income: new Map()},            
                });
            }            
            
            const popn = populations[coverage].get(code).get(d.year);
            const dist = new LinearSplinePDFIncomeDistribution(popn, d.distribution.y, d.distribution.fy);
            
            out.get(code)[coverage][measure].set(d.year, dist);
        });
        
        return out;
    }
    
    interpolateDistributions() {
        this.distributions.forEach((country, code, map) => {
            for (let coverage of ["urban", "rural", "national"]) {
                for (let measure of ["consumption", "income"]) {
                    var years = Array.from(country[coverage][measure].keys()).sort();
                    for (var i = 0; i < years.length - 1; i++) {
                        var dist_a = country[coverage][measure].get(years[i]);
                        var dist_b = country[coverage][measure].get(years[i+1]);
            
                        for (let year = years[i] + 1; year < years[i+1]; year++) {
                            var dist = LinearSplinePDFIncomeDistribution.convex_combination(
                                dist_a,
                                dist_b,
                                (year - years[i]) / (years[i+1] - years[i]),
                                this.populations[coverage].get(code).get(year)
                            );
                            dist.metadata = (dist_a.metadata || "") + (dist_b.metadata || "") + "; Interpolated linearly on time"
                            country[coverage][measure].set(year, dist);
                        }
                    }
                }               
            }
        });
    }
    
    extrapolateDistributions(basedOn) {
        this.distributions.forEach((country, code, map) => {
            for (let coverage of ["urban", "rural", "national"]) {
                for (let measure of ["consumption", "income"]) {
                    var years = Array.from(country[coverage][measure].keys()).sort();
                    if (years.length > 0) {
                        var lowYear = years[0];
                        var highYear = years[years.length-1];
                        
                        if (!this[basedOn].has(code))
                            continue;
                        
                        var extra_years = Array.from(this[basedOn].get(code).keys()).sort();
                        
                        for (let year of extra_years) {
                            if (year < lowYear)
                                var refYear = lowYear;
                            else if (year > highYear)
                                var refYear = highYear;
                            else
                                continue;
                            
                            //console.log("Extrapolating", code, year);
                            
                            var refDist = country[coverage][measure].get(refYear);
                            
                            if (this[basedOn].get(code).get(refYear) != null) {
                                var scale = (
                                    this[basedOn].get(code).get(year)
                                    /
                                    this[basedOn].get(code).get(refYear)
                                );
                                var dist = refDist.copyRescale(scale, this.populations[coverage].get(code).get(year));
                                dist.metadata = (refDist.metadata || "") + "; Extrapolated based on "+basedOn+", population";
                                country[coverage][measure].set(year, dist);
                            }
                        }
                    }
                }               
            }
        });
    }
    
    combineRuralUrbanDistributions() {
        this.distributions.forEach((country, code, map) => {
            for (let measure of ["consumption", "income"]) {
                if (country['national'][measure].size === 0) {
                    if (country['rural'][measure].size > 0 && country['urban'][measure].size > 0) {
                        const yearsRural = Array.from(country['rural'][measure].keys());
                        const yearsUrban = Array.from(country['urban'][measure].keys());
                        const years = yearsRural.filter(year => (yearsUrban.indexOf(year) !== -1));
                        years.forEach(year => {
                            //const popRural = this.populations['rural'].get(code).get(year);
                            //const popUrban = this.populations['urban'].get(code).get(year);
                            const distRural = country['rural'][measure].get(year);
                            const distUrban = country['urban'][measure].get(year);
                            const dist = LinearSplinePDFIncomeDistribution.convex_combination(distRural, distUrban);
                            dist.metadata = (distRural.metadata || "") + (distUrban.metadata || "") + "; Rural + Urban";
                            country['national'][measure].set(year, dist);
                        });
                    } else if (country['urban'][measure].size > 0) {
                        country['urban'][measure].forEach((distUrban, year, map) => {
                            const pop = this.populations['national'].get(code).get(year)
                            const dist = distUrban.copyRescale(1.0, pop);
                            dist.metadata = (distUrban.metadata || "") + "; Urban assumed to apply nationally";
                            country['national'][measure].set(year, dist);
                        });
                    } else if (country['rural'][measure].size > 0) {
                        country['rural'][measure].forEach((distUrban, year, map) => {
                            const pop = this.populations['national'].get(code).get(year)
                            const dist = distUrban.copyRescale(1.0, pop);
                            dist.metadata = (distUrban.metadata || "") + "; Rural assumed to apply nationally";
                            country['national'][measure].set(year, dist);
                        });
                    }
                }
            }
        });    
    }
    
}
const colors250 = ["#3957ff", "#d3fe14", "#c9080a", "#fec7f8", "#0b7b3e", "#0bf0e9", "#c203c8", "#fd9b39", "#888593", "#906407", "#98ba7f", "#fe6794", "#10b0ff", "#ac7bff", "#fee7c0", "#964c63", "#1da49c", "#0ad811", "#bbd9fd", "#fe6cfe", "#297192", "#d1a09c", "#78579e", "#81ffad", "#739400", "#ca6949", "#d9bf01", "#646a58", "#d5097e", "#bb73a9", "#ccf6e9", "#9cb4b6", "#b6a7d4", "#9e8c62", "#6e83c8", "#01af64", "#a71afd", "#cfe589", "#d4ccd1", "#fd4109", "#bf8f0e", "#2f786e", "#4ed1a5", "#d8bb7d", "#a54509", "#6a9276", "#a4777a", "#fc12c9", "#606f15", "#3cc4d9", "#f31c4e", "#73616f", "#f097c6", "#fc8772", "#92a6fe", "#875b44", "#699ab3", "#94bc19", "#7d5bf0", "#d24dfe", "#c85b74", "#68ff57", "#b62347", "#994b91", "#646b8c", "#977ab4", "#d694fd", "#c4d5b5", "#fdc4bd", "#1cae05", "#7bd972", "#e9700a", "#d08f5d", "#8bb9e1", "#fde945", "#a29d98", "#1682fb", "#9ad9e0", "#d6cafe", "#8d8328", "#b091a7", "#647579", "#1f8d11", "#e7eafd", "#b9660b", "#a4a644", "#fec24c", "#b1168c", "#188cc1", "#7ab297", "#4468ae", "#c949a6", "#d48295", "#eb6dc2", "#d5b0cb", "#ff9ffb", "#fdb082", "#af4d44", "#a759c4", "#a9e03a", "#0d906b", "#9ee3bd", "#5b8846", "#0d8995", "#f25c58", "#70ae4f", "#847f74", "#9094bb", "#ffe2f1", "#a67149", "#936c8e", "#d04907", "#c3b8a6", "#cef8c4", "#7a9293", "#fda2ab", "#2ef6c5", "#807242", "#cb94cc", "#b6bdd0", "#b5c75d", "#fde189", "#b7ff80", "#fa2d8e", "#839a5f", "#28c2b5", "#e5e9e1", "#bc79d8", "#7ed8fe", "#9f20c3", "#4f7a5b", "#f511fd", "#09c959", "#bcd0ce", "#8685fd", "#98fcff", "#afbff9", "#6d69b4", "#5f99fd", "#aaa87e", "#b59dfb", "#5d809d", "#d9a742", "#ac5c86", "#9468d5", "#a4a2b2", "#b1376e", "#d43f3d", "#05a9d1", "#c38375", "#24b58e", "#6eabaf", "#66bf7f", "#92cbbb", "#ddb1ee", "#1be895", "#c7ecf9", "#a6baa6", "#8045cd", "#5f70f1", "#a9d796", "#ce62cb", "#0e954d", "#a97d2f", "#fcb8d3", "#9bfee3", "#4e8d84", "#fc6d3f", "#7b9fd4", "#8c6165", "#72805e", "#d53762", "#f00a1b", "#de5c97", "#8ea28b", "#fccd95", "#ba9c57", "#b79a82", "#7c5a82", "#7d7ca4", "#958ad6", "#cd8126", "#bdb0b7", "#10e0f8", "#dccc69", "#d6de0f", "#616d3d", "#985a25", "#30c7fd", "#0aeb65", "#e3cdb4", "#bd1bee", "#ad665d", "#d77070", "#8ea5b8", "#5b5ad0", "#76655e", "#598100", "#86757e", "#5ea068", "#a590b8", "#c1a707", "#85c0cd", "#e2cde9", "#dcd79c", "#d8a882", "#b256f9", "#b13323", "#519b3b", "#dd80de", "#f1884b", "#74b2fe", "#a0acd2", "#d199b0", "#f68392", "#8ccaa0", "#64d6cb", "#e0f86a", "#42707a", "#75671b", "#796e87", "#6d8075", "#9b8a8d", "#f04c71", "#61bd29", "#bcc18f", "#fecd0f", "#1e7ac9", "#927261", "#dc27cf", "#979605", "#ec9c88", "#8c48a3", "#676769", "#546e64", "#8f63a2", "#b35b2d", "#7b8ca2", "#b87188", "#4a9bda", "#eb7dab", "#f6a602", "#cab3fe", "#ddb8bb", "#107959", "#885973", "#5e858e", "#b15bad", "#e107a7", "#2f9dad"];
const magic_bins = [10.17745883, 13, 17, 21, 27 , 35, 45, 57.79,74,94.29,120,150,200,250,300,400,500,650,800,1000,1300,1700,2200,2700,3500,4500,5500,7500,9579.994535]

class Series {
    constructor(names, series) {
        this.names = names;
        this.series = series;
        this.years = Array.from(this.series[0].keys()).sort();
        this.series.forEach(s => {
            const seriesYears = Array.from(s.keys());
            this.years = this.years.filter(y => seriesYears.indexOf(y) != -1);
        });

        if (this.series.length > 1) {
            this.aggregate = new Map(this.years.map(y => 
                [y,
                 LinearSplinePDFIncomeDistribution.aggregate(
                    this.series.map(s => s.get(y)),
                    1000
                 )]
            ))
        } else {
            this.aggregate = this.series[0];
        }
        console.log("Creating color scale with" + this.names);
        this.colorScale = d3.scaleOrdinal().range(colors250).domain(this.names);
        this.color = this.series.length > 0 ? "#999999" : this.colorScale(this.names[0]);
    }
    
    minYear() {
        return this.years[0];
    }
    
    maxYear() {
        return this.years[this.years.length - 1];
    }
    
    getExtentsX(lower, upper) {
        // TODO: use params
        //const ulim = Math.max(...this.series.map(s => Math.max(...Array.from(s.values()).map(d => d.inv(0.95)))))
        const ulim = Math.max(...Array.from(this.aggregate.values()).map(d => d.inv(0.95)));
        return [0, ulim];
    }
    
    getExtentsP(logscale) {
        //const ulim = this.series.map(s => Math.max(...Array.from(s.values()).map(d => d.pdf_max(true)))).reduce((a, b) => a + b);
        if (logscale)
            var ulim = Math.max(...Array.from(this.aggregate.values()).map(d => d.pdf_maxlog(true)));
        else
            var ulim = Math.max(...Array.from(this.aggregate.values()).map(d => d.pdf_max(true)));
                
        return [0, ulim];
    }

    getExtentsCDF () {
        var ulim = Math.max(...Array.from(this.aggregate.values()).map(d => d.population));
        return [0, ulim];
    }
      

    getExtentsHist(bins, logscale, extents) {
        if (extents === undefined) {
            extents = this.getExtentsX();
        }
        // TODO this is horrific what am I doing?!
        if (logscale)
            bins = magic_bins
            
        var ulim = Math.max(...Array.from(this.aggregate.values()).map(d => Math.max(...d.histogram(bins, true, extents).map(h => h.hist))));
        return [0, ulim];
    }
    
    getExtentsDeciles() {
        var ulim = Math.max(...Array.from(this.aggregate.values()).map(d => d.deciles()[9]).filter(m => !isNaN(m)));
        return [0, ulim];
    }
    
    getSeriesNames() {
        return this.names;
    }
    
    pdf(year, P, logscale = false, extents) {
        if (extents === undefined) {
            extents = this.getExtentsX();
            if (logscale) {
                extents[0] = 1.0;
            }
        }
        
        
        var grids;
        if (logscale)
            grids = this.series.map(s => s.get(year).loggrid(P, true, extents));
        else
            grids = this.series.map(s => s.get(year).grid(P, true, extents));            

        out = [];
        for (var i = 0; i < grids[0].length; i++) {
            var next = {x: grids[0][i].x};
            for (var n = 0; n < this.names.length; n++) {
                next[this.names[n]] = grids[n][i].pdf * (logscale ? grids[0][i].x : 1);
            }
            out.push(next);
        }
        return out;
    }

    // TODO this is the same as PDF, refactor
    cdf(year, P, logscale = false, extents) {
        if (extents === undefined) {
            extents = this.getExtentsX();
            if (logscale) {
                extents[0] = 1.0;
            }
        }
        
        var grids;
        if (logscale)
            grids = this.series.map(s => s.get(year).loggrid(P, true, extents));
        else
            grids = this.series.map(s => s.get(year).grid(P, true, extents));            

        out = [];
        for (var i = 0; i < grids[0].length; i++) {
            var next = {x: grids[0][i].x};
            for (var n = 0; n < this.names.length; n++) {
                next[this.names[n]] = grids[n][i].cdf;
            }
            out.push(next);
        }
        return out;
    }
        
    histogram(year, bins, logscale, extents) {
        if (extents === undefined) {
            extents = this.getExtentsX();
        }
        
        if (logscale) {
            bins = magic_bins;
        }
        
        let grids = this.series.map(s => s.get(year).histogram(bins, true, extents));

        out = [];

        for (var i = 0; i < grids[0].length; i++) {
            var next = {
                x: grids[0][i].x,
                xmin: grids[0][i].xmin,
                xmax: grids[0][i].xmax,
                width: grids[0][i].xmax - grids[0][i].xmin
            };
            for (var n = 0; n < this.names.length; n++) {
                next[this.names[n]] = grids[n][i].hist;
            }
            out.push(next);
        }
        return out;
    }
}