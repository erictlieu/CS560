/* https://observablehq.com/@d3/force-directed-graph */
/* https://flowingdata.com/2012/08/02/how-to-make-an-interactive-network-visualization/ */

drag = simulation => {
    function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }

    function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }

    function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }

    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
}

linkedByIndex = {}

neighboring = (a, b) => {
    return linkedByIndex[a.id + "," + b.id] || linkedByIndex[b.id + "," + a.id]
}

Promise.all([d3.csv("data/movies_metadata.csv"), d3.csv("data/ratings_small.csv"), d3.csv("data/links_small.csv")]).then(function(files) {
    let movie_data = files[0].reduce(function(map, obj) {
        map.set(obj.id, obj);
        return map;
    }, new Map());

    let movies = files[2].reduce(function(map, obj) {
        if(movie_data.has(obj.tmdbId)) {
            let temp = movie_data.get(obj.tmdbId)
            temp.tmdbId = temp.id;
            temp.id = obj.movieId;
            map.set(obj.movieId, temp);
        }
        return map;
    }, new Map());

    groups = d3.group(files[1], d => d.userId);
    groups = Array.from(groups.values()).slice(0, 200);
    let same_reviews = groups.reduce(function(map, obj) {
        obj.forEach(function(d1, k1) {
            var submap = obj.reduce(function(map2, obj2, k2) {
                if(obj2.movieId != d1.movieId) {
                    if(map2.has(obj2.movieId)) {
                        map2.get(obj2.movieId).push(obj2);
                    }
                    else {
                        map2.set(obj2.movieId, [obj2]);
                    }
                }

                return map2;
            }, map.has(d1.movieId) ? map.get(d1.movieId) : new Map() );

            map.set(d1.movieId, submap);
        })
        return map;
    }, new Map());

    let nodes = new Set();
    let links = [];
    same_reviews.forEach(function(d, k) {
        d.forEach(function(d2, k2) {
            if(d2.length > 45 && movies.has(k) && movies.has(k2)) {
                links.push({
                    source: k,
                    target: k2,
                    reviews: d2
                });
            }
        })
    })

    links.sort((a, b) => b.reviews.length - a.reviews.length)

    links.forEach(function(d) {
        nodes.add(movies.get(d.source));
        nodes.add(movies.get(d.target));
    })

    data = {
        nodes: Array.from(nodes),
        links: links
    };

    tooltip = d3.select("#chart")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden");

    width = 800
    height = 600

    const main_svg = d3.select("#chart")
        .append("svg")
        .attr("viewBox", [0, 0, 1000, 500])

    main_svg.append("line")
        .attr("x1", 700)
        .attr("y1", 0)
        .attr("x2", 700)
        .attr("y2", 500)
        .style("stroke", "black")
        .style("stroke-width", "1")

    main_svg.append("line")
        .attr("x1", 700)
        .attr("y1", 300)
        .attr("x2", 1000)
        .attr("y2", 300)
        .style("stroke", "black")
        .style("stroke-width", "1")

    const svg = main_svg.append("svg")
        .attr("viewBox", [0, 0, width, height])
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 700)
        .attr("height", 500);

    const svg2 = main_svg.append("svg")
        .attr("viewBox", [0, 0, 400, 400])
        .attr("x", 700)
        .attr("y", 0)
        .attr("width", 300)
        .attr("height", 300);

    const svg3 = main_svg.append("svg")
        .attr("viewBox", [0, 0, 600, 400])
        .attr("x", 700)
        .attr("y", 300)
        .attr("width", 300)
        .attr("height", 200);


    node_link_chart = function() {
        const links = data.links;
        const nodes = data.nodes;

        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id))
            .force("charge", d3.forceManyBody().strength(-100))
            .force("center", d3.forceCenter(width / 2, height / 2));

        const link = svg.append("g")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
        .selectAll("line")
            .enter()
            .data(links)
            .join("line")
            .attr("stroke-width", d => Math.sqrt(d.value));

        const node = svg.append("g")
            .attr("stroke", "#ddd")
            .attr("stroke-width", 1.5)
        .selectAll("circle")
            .enter()
            .data(nodes)
            .join("circle")
            .attr("r", 5)
            .attr("fill", "#777")
            .call(drag(simulation));

        showDetails = (i, d) => {
            content = '<p class="main"><div>' + d.title + '<div></p>'

            tooltip
               .style("top", (i.pageY + 15) + "px")
                .style("left", (i.pageX + 15) + "px")
                .style("visibility", "visible")
                .html(content);

            if(link) {
                link.attr("stroke", (l) => l.source == d || l.target == d ? "#555" : "#999")
                    .attr("stroke-opacity", (l) => l.source == d || l.target == d ? 1.0 : 0.6)
            }

            node.style("stroke", (n) => neighboring(d, n) ? "#333" : "#ddd")
                .style("stroke-width", (n) => neighboring(d, n) ? 2.0 : 1.0)

            d3.select(i.target).style("stroke","black")
                .style("stroke-width", 2.0)
        }

        hideDetails = (d,i) => {
            tooltip.style("visibility", "hidden")
            node.style("stroke", "#ddd")
                .style("stroke-width", 1.5)
            if(link)
                link.attr("stroke", "#999")
                    .attr("stroke-opacity", 0.6)
        }

        simulation.on("tick", () => {
            link.attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node.attr("cx", d => d.x)
                .attr("cy", d => d.y)
                .on("mouseover", showDetails)
                .on("mouseout", hideDetails);
        });
    }

    histogram_chart = function() {
        var margin = {top: 10, right: 30, bottom: 30, left: 40},
            width = 600 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;

        var x = d3.scaleLinear()
            .domain([0, 5])     // can use this instead of 1000 to have the max of data: d3.max(data, function(d) { return +d.price })
            .range([0, width]);
        svg3.append("g")
            .attr("transform", "translate(" + margin.left + "," + (height + margin.top) + ")")
            .call(d3.axisBottom(x));

        // set the parameters for the histogram
        var histogram = d3.histogram()
            .value(function(d) { return +d.rating - 0.25; })   // I need to give the vector of value
            .domain(x.domain())  // then the domain of the graphic
            .thresholds(x.ticks(10)); // then the numbers of bins

        // And apply this function to data to get the bins

        let data = [];
        same_reviews.forEach(function(d, k) {
            d.forEach(function(d2, k2) {
                if(d2.length > 45 && movies.has(k) && movies.has(k2)) {
                    data = data.concat(d2)
                }
            })
        })

        var bins = histogram(data);
        bins = bins.filter(d => d.x1 != d.x0)

        // Y axis: scale and draw:
        var y = d3.scaleLinear()
            .range([height, 0]);
            y.domain([0, d3.max(bins, function(d) { return d.length; })]);   // d3.hist has to be called before the Y axis obviously
        svg3.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .call(d3.axisLeft(y));

        // append the bar rectangles to the svg element
        svg3.selectAll("rect")
            .data(bins)
            .enter()
            .append("rect")
              .attr("x", 1)
              .attr("transform", function(d) { return "translate(" + (x(d.x0) + margin.left) + "," + (y(d.length) + margin.top) + ")"; })
              .attr("width", function(d) { return x(d.x1) - x(d.x0) -1 ; })
              .attr("height", function(d) { return height - y(d.length); })
              .style("fill", "#69b3a2")
    }

    node_link_chart();
    histogram_chart()
})
