
function timeit(call, reps = 1) {
    var t0 = performance.now();
    for (var i = 0; i < reps; i++) {
        eval(call);
    }
    var t1 = performance.now();
    console.log("Call to "+call+" took " + (t1 - t0)/reps + " milliseconds.")
}

class IncomeDistribution {
    constructor() {
    }
    
    pdf(x, population = false) {
        if (Array.isArray(x)) {
            return x.map(sx => this.pdf_scalar(sx) * (population ? this.population : 1));
        } else {
            return this.pdf_scalar(x) * (population ? this.population : 1);
        }
    }

    cdf(x, population = false) {
        if (Array.isArray(x)) {
            return x.map(sx => this.cdf_scalar(sx) * (population ? this.population : 1));
        } else {
            return this.cdf_scalar(x) * (population ? this.population : 1);
        }
    }
    
    inv(p, population = false) {
        if (Array.isArray(p)) {
            return p.map(sp => this.inv_scalar(sp / (population ? this.population : 1)))
        } else {
            return this.inv_scalar(p / (population ? this.population : 1));
        }
    }

    lorenz(p) {
        if (Array.isArray(p)) {
            return p.map(sp => this.lorenz_scalar(sp))
        } else {
            return this.lorenz_scalar(p);
        }
    }
    
    grid_lorenz(points) {
      var grid = [];
      var [lower, upper] = [0, 1];
      var step = (upper - lower) / (points - 1);
      for (var p = lower; p <= upper; p += step) {
          grid.push({
            p: p,
            L: this.lorenz_scalar(p)
          });
      }
      
      return grid;      
    }

    grid(points, popn, limits) {
        var grid = [];
        
        if (limits === undefined) {
            limits = [0,this.inv(0.99)];
        }
        
        var [lower, upper] = limits;
        var step = (upper - lower) / (points - 1);
        for (var x = lower; x <= upper; x += step) {
            grid.push({
                x: x,
                pdf: this.pdf(x, popn),
                cdf: this.cdf(x, popn)
            });
        }
        
        return grid;
    }

    loggrid(points, popn, limits) {
        var grid = [];
        
        if (limits === undefined) {
            limits = [0,this.inv(0.99)];
        }
        
        var [lower, upper] = limits;
        lower = Math.log(lower);
        upper = Math.log(upper);
        var step = (upper - lower) / (points - 1);
        for (var logx = lower; logx <= upper; logx += step) {
            var x = Math.exp(logx);
            grid.push({
                x: x,
                pdf: this.pdf(x, popn),
                cdf: this.cdf(x, popn)
            });
        }
        
        return grid;
    }

    // This method has slightly complicated parameters.
    //
    // If bins is a number:
    //   - that many equal bins are constructed between limits[0] and limits[1] inclusive,
    //   - the bins created are between each adjacent pair of numbers in bins; limits is ignored
    //
    // If extendUpper is true, the upper bin includes everything up to +infinity
    // If extendLower is true, the lower bin includes everything down to zero
    //
    // In any case, the bins returned will "hide" the extension lower and upper.
    histogram(bins, popn, limits, extendLower = true, extendUpper = true) {
        var gram = [];

        if (!Array.isArray(bins)) {
            var [lower, upper] = limits;
            var binCount = bins;
            var binwidth = (upper - lower) / binCount;
            bins = [];

            for (var i = 0; i <= binCount; i++) {
                var xmin = lower + binwidth * i;
                bins.push(xmin);
            }
        }
        
        for (var i = 1; i < bins.length; i++) {
            var xmin_true = (i == 1 && extendLower) ? 0 : bins[i-1];
            var xmax_true = (i == bins.length - 1 && extendUpper) ? Infinity : bins[i];
            gram.push({
                xmin: bins[i-1],
                xmax: bins[i],
                x: (bins[i]+bins[i-1])/2,
                hist: this.cdf(xmax_true, popn) - this.cdf(xmin_true, popn)
            })
        }
        
        return gram;
    }
    
    deciles() {
        var p = [0.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0];
        var L = this.lorenz(p);
        var out = [];
        var mean = this.mean()
        for (var i = 1; i < p.length; i++) {
            out.push(mean*(L[i]-L[i-1])/(p[i]-p[i-1]));
        }
        return out;
    }
    
    median() {
        return this.inv(0.5);
    }
    
    mean() {
      if (this.cachedMean === undefined) {
        const p = v_grid(0, 1, 1000);
        const x = this.inv(p);
        const integral = integrate(x, p);
        this.cachedMean = integral[integral.length-1];
      }
      return this.cachedMean;
    }
    
    gini() {
        const dp = 0.01;
        let G = 0;
        for (var p = 0; p < 1.0; p += dp) {
            let pmid = p + dp/2;
            let L = this.lorenz_scalar(pmid);
            G += L * dp;
        }
        G = 1 - 2*G;
        return G;
    }
}

function v_cumsum(x) {
    var new_array = [];
    x.reduce(function(a,b,i) { return new_array[i] = a+b; },0);
    return new_array;
}

function v_add(a, b) {
    out = [];
    for (var i = 0; i < a.length; i++) {
        out.push(a[i] + b[i]);
    }
    return out;
}

function v_sub(a, b) {
    out = [];
    for (var i = 0; i < a.length; i++) {
        out.push(a[i] - b[i]);
    }
    return out;
}

function v_mult(a, b) {
    out = [];
    for (var i = 0; i < a.length; i++) {
        out.push(a[i] * b[i]);
    }
    return out;
}

function v_scale(a, s) {
    return a.map(function (x) { return x * s; });
}

function v_grid(lower, upper, steps) {
    const step = (upper - lower) / steps;
    let x = [];
    for (var ix = lower; ix <= upper; ix += step) {
        x.push(ix);
    }
    return x;
}

function integrate(y, x) {
    dx = v_sub(x.slice(1), x.slice(undefined, -1));
    mid_y = v_scale(v_add(y.slice(1), y.slice(undefined, -1)),0.5);
    out = v_cumsum(v_mult(dx, mid_y));
    out.unshift(0);
    return out;
}

class LinearSplinePDFIncomeDistribution extends IncomeDistribution {
    constructor (population, x, fx) {
        super()
        this.population = population;
        this.x = x;
        this.fx = fx;
        this.Fx = integrate(fx, x);
        this.last_x_index = 1;
    }
    
    copyRescale (rescale, population) {
        // we contract or expand on the x axis, but also need to scale the fx values by
        // the reciprocal so that it continues to integrate to 1 as a PDF must
        const newx = v_scale(this.x, rescale);
        const newfx = v_scale(this.fx, 1.0/rescale);
        
        const copy = new LinearSplinePDFIncomeDistribution(population, newx, newfx);
        return copy;
    }
    
    static convex_combination(a, b, p, population) {
        // p is usually in an interval, but rescale so they don't have to be
        if (p === undefined)
            p = a.population / (a.population + b.population);
        if (population === undefined)
            population = a.population + b.population;
        
        // assumes es6 sets preserve order, which is apparently true
        var x = [...new Set([...a.x, ...b.x])];
        x.sort((a,b) => (a-b));
        var fx = v_add(v_scale(a.pdf(x), p), v_scale(b.pdf(x), 1-p));
        return new LinearSplinePDFIncomeDistribution(population, x, fx);
    }
    
    static aggregate(dists, points) {
        points = points || 500;
        
        var lower = 0;
        var upper = Math.max(...dists.map(d => d.x[d.x.length-1]))
        
        var x = [];
        var fx = [];
        var step = (upper - lower) / (points - 1);
        for (var ix = lower; ix <= upper; ix += step) {
            x.push(ix);
            fx.push(dists.map(d => d.pdf_scalar(ix, true) * d.population).reduce((a, b) => a + b));
        }

        var population = dists.map(d => d.population).reduce((a, b) => a + b);
        fx = v_scale(fx, 1/population)
        
        return new LinearSplinePDFIncomeDistribution(population, x, fx);
    }
    
    pdf_scalar(x) {
        for (var i = 0; i < this.fx.length; i++) {
            if (this.x[i] > x) {
                return this.fx[i-1] + (this.fx[i] - this.fx[i-1]) * (x - this.x[i-1]) / (this.x[i] - this.x[i-1]);
            }
        }
        return 0;
    }
    
    pdf_max(popn) {
        return Math.max(...this.fx) * (popn ? this.population : 1);            
    }
    
    pdf_argmax() {
        return this.x[this.fx.indexOf(this.pdf_max(false))];
    }
    
    pdf_maxlog(popn) {
        return Math.max(...v_mult(this.fx, this.x)) * (popn ? this.population : 1); 
    }
    
    cdf_scalar(x) {
        for (var i = 0; i < this.Fx.length; i++) {
            if (this.x[i] > x) {
                //return this.Fx[i-1] + (this.Fx[i] - this.Fx[i-1]) * (x - this.x[i-1]) / (this.x[i] - this.x[i-1]);
                return this.Fx[i-1] + (x - this.x[i-1]) * this.fx[i-1] + (1/2) * (this.fx[i] - this.fx[i-1]) / (this.x[i] - this.x[i-1]) * (x - this.x[i-1])**2
            }
        }
        return 1;            
    }
    
    inv_scalar(p) {
        for (var i = 0; i < this.x.length; i++) {
            if (this.Fx[i] > p) {
                var a = (1/2) * (this.fx[i] - this.fx[i-1])/(this.x[i] - this.x[i-1]);
                var b = this.fx[i-1];
                return this.x[i-1] + (-b + Math.sqrt(b**2 + 4*a*(p - this.Fx[i-1])))/(2*a);
            }
        }
        return this.x[this.x.length-1];
    }
    
    lorenz_scalar(p) {
        var integral = 0;
        for (var i = 1; this.Fx[i-1] <= p && i < this.x.length; i++) {
            var pstar = Math.min(p, this.Fx[i]);
            var k0 = (this.fx[i] - this.fx[i-1]) / (this.x[i] - this.x[i-1]);
            if(k0 !== 0.0) {
                var c = (pstar - this.Fx[i-1])*(this.x[i-1] - this.fx[i-1]/k0);
                var d = ((this.fx[i-1]**2 + 2*k0*(pstar - this.Fx[i-1]))**(3/2) - this.fx[i-1]**3) / (3 * k0**2);
                // very small values can cause NaNs which we hack around - TODO: think more about this
                integral = integral + (isNaN(c) ? 0 : c)   + (isNaN(d) ? 0 : d);
            }
            //console.log(i, k0, c, d, integral);
        }
        return integral / this.mean();
    }
}

class LogNormalIncomeDistribution extends IncomeDistribution {
    constructor (population, mean, gini) {
        super();
        this.population = population;
        this.mean = mean;
        this.gini = gini;
        this.sigma = jStat.normal.inv((this.gini + 1)/2, 0, 1) * Math.sqrt(2);
        this.mu = Math.log(this.mean) - 0.5 * this.sigma ** 2;
    }
    
    pdf_scalar(x) {
        return jStat.lognormal.pdf(x, this.mu, this.sigma);
    }
    
    cdf_scalar(x) {
        return jStat.lognormal.cdf(x, this.mu, this.sigma);            
    }
    
    inv_scalar(p) {
        return jStat.lognormal.inv(p, this.mu, this.sigma);
    }
    
    lorenz_scalar(p) {
        return jStat.normal.cdf(jStat.normal.inv(p, 0, 1)-this.sigma, 0, 1);
    }
}

//export {IncomeDistribution, LogNormalIncomeDistribution, LinearSplineIncomeDistribution, timeit}