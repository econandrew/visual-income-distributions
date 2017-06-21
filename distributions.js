   
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

        grid(points, popn, limits) {
            var grid = [];
            
            if (limits == undefined) limits = [0,this.inv(0.99)];
            
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
        
        histogram(bins, popn, limits) {
            var gram = [];
            
            var [lower, upper] = limits;
//            lower = 0;
            var binwidth = (upper - lower) / (bins - 1);
//            gram.push({
//                xmin: lower-binwidth,
//                xmax: lower,
//                x:    lower-binwidth/2,
//                hist: this.cdf(lower, popn)
//            })
            for (var bin = 0; bin < bins - 1; bin++) {
                var xmin = lower + binwidth * bin;
                gram.push({
                    xmin: xmin,
                    xmax: xmin+binwidth,
                    x:    xmin+binwidth/2,
                    hist: this.cdf(xmin+binwidth, popn) - this.cdf(xmin, popn)
                })
            }
            gram.push({
                xmin: upper,
                xmax: upper+binwidth,
                x:    upper+binwidth/2,
                hist: this.cdf(Infinity, popn) - this.cdf(upper, popn)
            })
            
            return gram;
        }
        
        deciles() {
            var p = [0.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0];
            var L = this.lorenz(p);
            var out = [];
            for (var i = 1; i < p.length; i++) {
                out.push((L[i]-L[i-1])/(p[i]-p[i-1]));
            }
            return out;
        }
        
        median() {
            return this.inv(0.5);
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
        
        static convex_combination(a, b, p, population) {
            // assumes es6 sets preserve order, which is apparently true
            var x = [...new Set([...a.x, ...b.x])];
            var fx = v_add(v_scale(a.pdf(x), 1-p), v_scale(b.pdf(x), p));
            population = population | a.population * (1-p) + b.population * p;
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
                    integral = integral + c + d;
                }
                //console.log(i, k0, c, d, integral);
            }
            return integral;
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
            return jStat.normal.cdf(jStat.normal.inv(p, 0, 1)-this.sigma, 0, 1)*this.mean;
        }
    }
