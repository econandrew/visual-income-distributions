Vue.component('pdf-chart', {
    props: ['series', 'year', 'isLog'],
    template: '<svg width="800px" height="450px"></svg>',
    watch: {
        series: function (newSeries) {
            this.updateScales(newSeries);
            this.drawChart(newSeries, this.year);
        },
        year: function (newYear) {
            this.drawChart(this.series, newYear, fast = this.fastDrawing);
            if (this.delayedDrawTimer !== undefined)
              this.delayedDrawTimer = clearTimeout(this.delayedDrawTimer);
            if (this.fastDrawing) {
              this.delayedDrawTimer = setTimeout(() => {
                  this.drawChart(this.series, newYear, fast = false);
              }, 500);
            }
        },
        isLog: function (newIsLog) {
            this.updateScales(this.series);
            this.drawChart(this.series, this.year);
        }
    },
    computed: {
      xScale: function() {
        return this.isLog ? this.xScaleLog : this.xScaleLinear;
      },
      xAxis: function() {
        return this.isLog ? this.xAxisLog : this.xAxisLinear;
      }
    },
    mounted: function () {
        this.fastDrawing = false;
      
        var svg = d3.select(this.$el);
        var width = parseInt(svg.style("width"), 10);
        var height = parseInt(svg.style("height"), 10);

        var margin = { top:20, left:45, bottom:30, right:0 };
        var chartWidth = width - (margin.left + margin.right);
        var chartHeight = height - (margin.top + margin.bottom);
        
        this.chartLayer = svg
            .append('g')
            .attr(
              "transform",
              `translate(${margin.left}, ${margin.top})`
            );

        this.chartLayer.append("g").attr("class", "x axis");
        this.chartLayer.append("g").attr("class", "y axis");

        // create any reuseable parts
        this.xScaleLog = d3.scaleLog().domain([1,10000]);
        this.xScaleLinear = d3.scaleLinear();
        this.yScale = d3.scaleLinear();
        //this.zScale = d3.scaleOrdinal().range(colors250);
        this.xAxisLinear = d3.axisBottom(this.xScaleLinear).ticks(5, "s").tickFormat(d3.format("d"));
        this.xAxisLog = d3.axisBottom(this.xScaleLog).tickValues([1,10,100,1000,10000]).tickFormat(d3.format("d"));
        this.yAxis = d3.axisLeft(this.yScale).ticks(10, "s");
        this.line = d3.line().x(d => this.xScale(d[0])).y(d => this.yScale(d[1]));
        this.stack = d3.stack()
            .order(d3.stackOrderNone)
            .offset(d3.stackOffsetNone);

        this.area = d3.area()
            .x((d, i) => this.xScale(d.data.x))
            .y0(d => this.yScale(d[0]))
            .y1(d => this.yScale(d[1]));
            
        this.xScaleLinear.range([0, chartWidth]);
        this.xScaleLog.range([0, chartWidth]);
        this.yScale.range([chartHeight, 0]);

        this.updateScales(this.series);
        this.drawChart(this.series, this.year);
    },
    methods: {
        updateScales: function(series) {
            this.stack.keys(series.getSeriesNames());

            this.xScaleLinear.domain(series.getExtentsX());
            this.yScale.domain(series.getExtentsP(this.isLog));
            
            // Update the x-axis.
            this.chartLayer.select(".x.axis")
                .attr("transform", "translate(0," + this.yScale.range()[0] + ")")
                .call(this.xAxis);

            // Update the y-axis. If it's a log chart we remove it as it lacks meaning
            if (this.isLog)
              this.chartLayer.select(".y.axis").selectAll("*").remove();
            else
              this.chartLayer.select(".y.axis").call(this.yAxis);

        },
        drawChart: function (series, year, fast = false) {
            var t0 = performance.now();
            
            var data = this.stack(series.pdf(year, fast ? 50 : 1000, logscale = this.isLog, this.xScale.domain()));
            
            var layer = this.chartLayer.selectAll(".layer")
                .data(data, d => d.key);
            
            layer.enter().append("g")
                .attr("class", "layer") 
                .append("path")
                .attr("class", "line")
                .attr("fill", d => series.colorScale(d.key))
                .attr("d", this.area);                
                          
            layer.select(".line")
                .attr("fill", d => series.colorScale(d.key)) // TODO this shouldn't need updating every time if we don't recolor
                .attr("d", this.area);
                
            layer.exit().remove();
            
            var t1 = performance.now();
            if (!fast) {
              if (t1 - t0 > 200) {
                this.fastDrawing = true;
              } else {
                this.fastDrawing = false;
              }
            }
        }
    }
});

Vue.component('cdf-chart', {
    props: ['series', 'year', 'isLog'],
    template: '<svg width="800px" height="450px"></svg>',
    watch: {
        series: function (newSeries) {
            this.updateScales(newSeries);
            this.drawChart(newSeries, this.year);
        },
        year: function (newYear) {
            this.drawChart(this.series, newYear, fast = this.fastDrawing);
            if (this.delayedDrawTimer !== undefined)
              this.delayedDrawTimer = clearTimeout(this.delayedDrawTimer);
            if (this.fastDrawing) {
              this.delayedDrawTimer = setTimeout(() => {
                  this.drawChart(this.series, newYear, fast = false);
              }, 500);
            }
        },
        isLog: function (newIsLog) {
            this.updateScales(this.series);
            this.drawChart(this.series, this.year);
        }
    },
    computed: {
      xScale: function() {
        return this.isLog ? this.xScaleLog : this.xScaleLinear;
      },
      xAxis: function() {
        return this.isLog ? this.xAxisLog : this.xAxisLinear;
      }
    },
    mounted: function () {
        this.fastDrawing = false;
      
        var svg = d3.select(this.$el);
        var width = parseInt(svg.style("width"), 10);
        var height = parseInt(svg.style("height"), 10);

        var margin = { top:20, left:45, bottom:30, right:0 };
        var chartWidth = width - (margin.left + margin.right);
        var chartHeight = height - (margin.top + margin.bottom);
        
        this.chartLayer = svg
            .append('g')
            .attr(
              "transform",
              `translate(${margin.left}, ${margin.top})`
            );

        this.chartLayer.append("g").attr("class", "x axis");
        this.chartLayer.append("g").attr("class", "y axis");

        // create any reuseable parts
        this.xScaleLog = d3.scaleLog().domain([1,10000]);
        this.xScaleLinear = d3.scaleLinear();
        this.yScale = d3.scaleLinear();
        //this.zScale = d3.scaleOrdinal().range(colors250);
        this.xAxisLinear = d3.axisBottom(this.xScaleLinear).ticks(5, "s").tickFormat(d3.format("d"));
        this.xAxisLog = d3.axisBottom(this.xScaleLog).tickValues([1,10,100,1000,10000]).tickFormat(d3.format("d"));
        this.yAxis = d3.axisLeft(this.yScale).ticks(10, "s");
        this.line = d3.line().x(d => this.xScale(d[0])).y(d => this.yScale(d[1]));
        this.stack = d3.stack()
            .order(d3.stackOrderNone)
            .offset(d3.stackOffsetNone);

        this.area = d3.area()
            .x((d, i) => this.xScale(d.data.x))
            .y0(d => this.yScale(d[0]))
            .y1(d => this.yScale(d[1]));
            
        this.xScaleLinear.range([0, chartWidth]);
        this.xScaleLog.range([0, chartWidth]);
        this.yScale.range([chartHeight, 0]);

        this.updateScales(this.series);
        this.drawChart(this.series, this.year);
    },
    methods: {
        updateScales: function(series) {
            this.stack.keys(series.getSeriesNames());

            this.xScaleLinear.domain(series.getExtentsX());
            this.yScale.domain(series.getExtentsCDF());
            
            this.chartLayer.select(".x.axis")
                .attr("transform", "translate(0," + this.yScale.range()[0] + ")")
                .call(this.xAxis);

            this.chartLayer.select(".y.axis").call(this.yAxis);

        },
        drawChart: function (series, year, fast = false) {
            var t0 = performance.now();
            
            var data = this.stack(series.cdf(year, fast ? 50 : 1000, logscale = this.isLog, this.xScale.domain()));
            
            var layer = this.chartLayer.selectAll(".layer")
                .data(data, d => d.key);
            
            layer.enter().append("g")
                .attr("class", "layer") 
                .append("path")
                .attr("class", "line")
                .attr("fill", d => series.colorScale(d.key))
                .attr("d", this.area);                
                          
            layer.select(".line")
                .attr("fill", d => series.colorScale(d.key)) // TODO this shouldn't need updating every time if we don't recolor
                .attr("d", this.area);
                
            layer.exit().remove();
            
            var t1 = performance.now();
            if (!fast) {
              if (t1 - t0 > 200) {
                this.fastDrawing = true;
              } else {
                this.fastDrawing = false;
              }
            }
        }
    }
});

Vue.component('histogram-chart', {
    props: ['series', 'year', 'isLog'],
    template: '<svg width="800px" height="450px"></svg>',
    watch: {
        series: function (newSeries) {
            this.updateScales(newSeries);
            this.drawChart(newSeries, this.year);
        },
        year: function (newYear) {
            this.drawChart(this.series, newYear);
        },
        isLog: function (newIsLog) {
            this.updateScales(this.series);
            this.drawChart(this.series, this.year);
        },
    },
    computed: {
      xScale: function() {
        return this.isLog ? this.xScaleLog : this.xScaleLinear;
      },
      xAxis: function() {
        return this.isLog ? this.xAxisLog : this.xAxisLinear;
      }
    },
    mounted: function () {
        console.log("hist", this);
        var svg = d3.select(this.$el);
        var width = parseInt(svg.style("width"), 10);
        var height = parseInt(svg.style("height"), 10);

        var margin = { top:20, left:45, bottom:30, right:0 };
        var chartWidth = width - (margin.left + margin.right);
        var chartHeight = height - (margin.top + margin.bottom);
        
        this.chartLayer = svg
            .append('g')
            .attr(
              "transform",
              `translate(${margin.left}, ${margin.top})`
            );

        this.chartLayer.append("g").attr("class", "x axis");
        this.chartLayer.append("g").attr("class", "y axis");

        this.xScaleLinear = d3.scaleLinear();
        this.xScaleLog = d3.scaleLog().domain([1, 10000]);
        this.yScale = d3.scaleLinear();

        this.xScaleLinear.range([0, chartWidth]);
        this.xScaleLog.range([0, chartWidth]);
        this.yScale.range([chartHeight, 0]);

        this.xScaleLogAxis = d3.scaleLog().domain([13, 7500]).range([this.xScaleLog(13),this.xScaleLog(7500)]);

        this.xAxisLinear = d3.axisBottom(this.xScaleLinear).ticks(5, "s").tickFormat(d3.format("d"));
        this.xAxisLog = d3.axisBottom(this.xScaleLogAxis).tickValues([13, 21, 35, 57.79,94.29,200,500,1000,2200,4500,7500]).tickFormat(d3.format("d"));
        this.yAxis = d3.axisLeft(this.yScale).ticks(10, "s");

        this.stack = d3.stack()
            .order(d3.stackOrderNone)
            .offset(d3.stackOffsetNone);
            

        this.updateScales(this.series);
        this.drawChart(this.series, this.year);
    },
    methods: {
        updateScales: function(series) {
            this.stack.keys(series.getSeriesNames());

            this.xScaleLinear.domain(series.getExtentsX());
            this.yScale.domain(series.getExtentsHist(20, this.isLog));
            
            this.chartLayer.select(".x.axis")
                .attr("transform", "translate(0," + this.yScale.range()[0] + ")")
                .call(this.xAxis);

            this.chartLayer.select(".y.axis")
                .call(this.yAxis);
        },
        drawChart: function (series, year) {
            var data = this.stack(series.histogram(year, 20, logscale = this.isLog));
            
            // Each country series is a layer
            var layer = this.chartLayer
              .selectAll(".layer")
              .data(data, d => d.key);
            
            // Entering country series
            layer.enter().append("g")
              .attr("class", "layer")
              .attr("fill", d => series.colorScale(d.key))
              .selectAll("rect")
              .data(d => d)
              .enter()
              .append("rect")
              .attr("x", d => this.xScale(d.data.xmin)+1)              
              .attr("y", d => this.yScale(d[1]))              
              .attr("height", d => this.yScale(d[0])-this.yScale(d[1]))                
              .attr("width", d => this.xScale(d.data.xmax) - this.xScale(d.data.xmin) - 2);                
                          
            // Updating country series
            var rects = layer
              .attr("fill", d => series.colorScale(d.key))
              .selectAll("rect")
              .data(d => d)
              
            rects.enter().append("rect")
              .attr("x", d => this.xScale(d.data.xmin)+1)              
              .attr("y", d => this.yScale(d[1]))              
              .attr("height", d => this.yScale(d[0])-this.yScale(d[1]))                
              .attr("width", d => this.xScale(d.data.xmax) - this.xScale(d.data.xmin) - 2);                
            
            // On an existing layer, we treat old and new rects the same
            rects.enter().merge(rects);

            rects.transition().duration(200)
              .attr("x", d => this.xScale(d.data.xmin)+1)              
              .attr("y", d => this.yScale(d[1]))              
              .attr("height", d => this.yScale(d[0])-this.yScale(d[1]))                
              .attr("width", d => this.xScale(d.data.xmax) - this.xScale(d.data.xmin) - 2)
            
            rects.exit().transition().duration(200).remove();            
            
            // Exiting country series
            layer.exit().remove();             
        }
    }
});

Vue.component('deciles-chart', {
    props: ['series', 'year'],
    template: '<svg width="800px" height="450px"></svg>',
    watch: {
        series: function (newSeries) {
            this.updateScales(newSeries);
            this.drawChart(newSeries, this.year);
        },
        year: function (newYear) {
            this.drawChart(this.series, newYear);
        },
    },
    mounted: function () {
        var svg = d3.select(this.$el);
        var width = parseInt(svg.style("width"), 10);
        var height = parseInt(svg.style("height"), 10);

        var margin = { top:20, left:45, bottom:30, right:0 };
        var chartWidth = width - (margin.left + margin.right);
        var chartHeight = height - (margin.top + margin.bottom);
        
        this.chartLayer = svg
            .append('g')
            .attr(
              "transform",
              `translate(${margin.left}, ${margin.top})`
            );

        this.chartLayer.append("g").attr("class", "x axis");
        this.chartLayer.append("g").attr("class", "y axis");

        this.xScale = d3.scaleBand()
          .paddingInner(1/10)
          .paddingOuter(1/10);
        this.yScale = d3.scaleLinear();
        this.xAxis = d3.axisBottom(this.xScale);
        this.yAxis = d3.axisLeft(this.yScale).ticks(10, "s");

        this.xScale.range([0, chartWidth]);
        this.yScale.range([chartHeight, 0]);

        this.updateScales(this.series);
        this.drawChart(this.series, this.year);     
    },
    methods: {
        updateScales: function(series) {
            this.xScale.domain([0,1,2,3,4,5,6,7,8,9]);
            this.yScale.domain(series.getExtentsDeciles());
            
            this.chartLayer.select(".x.axis")
                .attr("transform", "translate(0," + this.yScale.range()[0] + ")")
                .call(this.xAxis);

            this.chartLayer.select(".y.axis")
                .call(this.yAxis);
        },
        drawChart: function (series, year) {
            //var data = series.deciles(year);
            var data = series.aggregate.get(year).deciles();
            
            // Each country series is a layer
            var layer = this.chartLayer
              .selectAll(".layer")
              .data([data]);
            
            // Entering country series
            layer.enter().append("g")
              .attr("class", "layer")
              .attr("fill", series.color)
              .selectAll("rect")
              .data(d => d)
              .enter()
              .append("rect")
              .attr("x", (d,i) => this.xScale(i))              
              .attr("y", d => this.yScale(d))              
              .attr("height", d => this.yScale(0) - this.yScale(d))                
              .attr("width", d => this.xScale.bandwidth());                
                          
            // Updating country series
            layer
              .attr("fill", series.color)
              .selectAll("rect")
              .data(d => d).transition().duration(200)
              .attr("x", (d,i) => this.xScale(i))              
              .attr("y", d => this.yScale(d))              
              .attr("height", d => this.yScale(0) - this.yScale(d))                
              .attr("width", d => this.xScale.bandwidth());                
            
            // Exiting country series
            layer.exit().remove();             
        }
    }
});

