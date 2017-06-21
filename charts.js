function pdfChart() {
    var margin = {top: 20, right: 20, bottom: 20, left: 20},
        width = 400,
        height = 400,
        xValue = function(d) { return d[0]; },
        yValue = function(d) { return d[1]; },
        xScale = d3.scaleLinear(),
        yScale = d3.scaleLinear(),
        zScale = d3.scaleOrdinal(d3.schemeCategory10);
        xAxis = d3.axisBottom(xScale),
        yAxis = d3.axisLeft(yScale),
        line = d3.line().x(X).y(Y),
        xDomain = null,
        yDomain = null;

    function chart(selection) {
        selection.each(function(data) {
            // Convert data to standard representation greedily;
            // this is needed for nondeterministic accessors.
            dist = data[0]
            var grid = dist.grid(1000, true, chart.xlim());

            data = grid.map(function(d, i) {
                return [xValue.call(data, d, i), yValue.call(data, d, i)];
            });

            // Update the x-scale and y-scale.
            xScale.range([0, width - margin.left - margin.right]);
            yScale.range([height - margin.top - margin.bottom, 0]);

            xScale.domain(xDomain ? xDomain : d3.extent(data, function(d) { return d[0]; }));
            yScale.domain(yDomain ? yDomain : [0, d3.max(data, function(d) { return d[1]; })]);

            // Select the svg element, if it exists.
            var svg = d3.select(this).selectAll("svg").data([data]);

            // Otherwise, create the skeletal chart.
            var svgEnter = svg.enter();
            var gEnter = svgEnter.append("svg").append("g");
            gEnter.append("path")
                .attr("class", "line")
                .attr("fill", "none")
                .attr("stroke", "blue")
                .attr("stroke-width", 1.5)
                .attr("stroke-linejoin", "round");
            
            gEnter.append("line")
                .attr("class", "median")
                .attr("fill", "none")
                .attr("stroke", "blue")
                .attr("stroke-width", 0.5)
                .attr("stroke-dasharray", "5, 5")
                .attr("stroke-linejoin", "round");
            
            gEnter.append("g").attr("class", "x axis");
            gEnter.append("g").attr("class", "y axis");

            //svg = svgEnter.merge(svg);
            var svg = d3.select(this).selectAll("svg");

            // Update the outer dimensions.
            svg.attr("width", width)
              .attr("height", height);
              
              //console.log(svg);
              //console.log(d3.select(this).selectAll("svg"));

            // Update the inner dimensions.
            var g = svg.transition().select("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
             
            // Update the line path.
            g.select(".line")
              .attr("d", line)
              
            //console.log(data);
              
            g.select(".median")
              .attr("x1", xScale(dist.median()))
              .attr("y1", yScale(0))
              .attr("x2", xScale(dist.median()))
              .attr("y2", yScale(dist.pdf(dist.median(), true)));

            // Update the x-axis.
            g.select(".x.axis")
              .attr("transform", "translate(0," + yScale.range()[0] + ")")
              .call(xAxis);

            // Update the x-axis.
            g.select(".y.axis")
              .call(yAxis);

        });
    }

    // The x-accessor for the path generator; xScale ∘ xValue.
    function X(d) {
        return xScale(d[0]);
    }

    // The x-accessor for the path generator; yScale ∘ yValue.
    function Y(d) {
        return yScale(d[1]);
    }

    chart.margin = function(_) {
        if (!arguments.length) return margin;
        margin = _;
        return chart;
    };

    chart.width = function(_) {
        if (!arguments.length) return width;
        width = _;
        return chart;
    };

    chart.height = function(_) {
        if (!arguments.length) return height;
        height = _;
        return chart;
    };

    chart.x = function(_) {
        if (!arguments.length) return xValue;
        xValue = _;
        return chart;
    };

    chart.y = function(_) {
        if (!arguments.length) return yValue;
        yValue = _;
        return chart;
    };

    chart.xlim = function(_) {
        if (!arguments.length) return xDomain;
        xDomain = _;
        return chart;
    };

    chart.ylim = function(_) {
        if (!arguments.length) return yDomain;
        yDomain = _;
        return chart;
    };

    return chart;
}