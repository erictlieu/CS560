/* https://observablehq.com/@d3/force-directed-graph */
/* https://flowingdata.com/2012/08/02/how-to-make-an-interactive-network-visualization/ */
/* https://www.d3-graph-gallery.com/graph/chord_colors.html */

drag = simulation => {
    function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.1).restart();
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

tooltip = d3.select("#chart")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden");

const main_svg = d3.select("#chart")
    .append("svg")
    .attr("viewBox", [0, 0, 1000, 500])

main_svg.append("line")
    .attr("x1", 600)
    .attr("y1", 0)
    .attr("x2", 600)
    .attr("y2", 500)
    .style("stroke", "black")
    .style("stroke-width", "1")

main_svg.append("line")
    .attr("x1", 600)
    .attr("y1", 300)
    .attr("x2", 1000)
    .attr("y2", 300)
    .style("stroke", "black")
    .style("stroke-width", "1")

const svg = main_svg.append("svg")
    .attr("viewBox", [0, 0, 1200, 1000])
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 600)
    .attr("height", 500);

const svg2 = main_svg.append("svg")
    .attr("viewBox", [0, 0, 800, 600])
    .attr("x", 600)
    .attr("y", 0)
    .attr("width", 400)
    .attr("height", 300)
    .append("g")
        .attr("transform", "translate(400,300)");

const svg3 = main_svg.append("svg")
    .attr("viewBox", [0, 0, 800, 400])
    .attr("x", 600)
    .attr("y", 300)
    .attr("width", 400)
    .attr("height", 200);

const simulation = d3.forceSimulation()
    .force("charge", d3.forceManyBody().strength(-200))
    .force("center", d3.forceCenter(600, 500));

filtered_genre = null;

linkedByIndex = {}
neighboring = (a, b) => {
    return linkedByIndex[a.id + "," + b.id] || linkedByIndex[b.id + "," + a.id]
}

Promise.all([d3.csv("data/movies_metadata.csv"), d3.csv("data/ratings_small.csv"), d3.csv("data/links_small.csv")]).then(function(files) {
    let movies = getMovieData(files[0], files[2])
    let genreData = getGenreData(movies)
    let genres = genreData.genres
    let genresOrdered = genreData.genresOrdered
    let groups = getGroups(files[1])
    let flat_same_reviews = getSameReviews(groups, movies)
    movies = updateMovies(movies, groups)

    let nodeData = getNodeData(flat_same_reviews, movies)

    data = {
        genres: genres,
        genresOrdered: genresOrdered,
        reviews: flat_same_reviews,
        movies: movies,
        allNodes: nodeData.nodes,
        allLinks: nodeData.links,
        nodes: nodeData.nodes,
        links: nodeData.links
    };

    showDetails = (i, d) => {
        content = '<p class="main">' + d.title + '</p>'
        content += '<p class="sub">Avg rating: '+d3.mean(d.reviews.map(v => +v.rating)).toFixed(2)+'</p>'

        tooltip
            .style("top", (i.pageY + 15) + "px")
            .style("left", (i.pageX + 15) + "px")
            .style("visibility", "visible")
            .html(content);

        if(data.link) {
            data.link.attr("stroke", (l) => l.source == d || l.target == d ? "#555" : "#999")
                .attr("stroke-opacity", (l) => l.source == d || l.target == d ? 1.0 : 0.6)
        }

        data.node.style("stroke", (n) => neighboring(d, n) ? "#333" : "#ddd")
            .style("stroke-width", (n) => neighboring(d, n) ? 2.0 : 1.0)

        d3.select(i.target).style("stroke","black")
            .style("stroke-width", 2.0)
    }

    hideDetails = (d,i) => {
        tooltip.style("visibility", "hidden")
        data.node.style("stroke", "#ddd")
            .style("stroke-width", 1.5)
        if(data.link)
            data.link.attr("stroke", "#999")
                .attr("stroke-opacity", 0.6)
    }

    node_link_chart = function() {
        simulation.nodes(data.nodes)
            .force("link", d3.forceLink(data.links).id(d => d.id).strength(0.05))

        data.link = svg.append("g")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.5)
        .selectAll("line")
            .enter()
            .data(data.links)
            .join("line")
            .attr("stroke-width", 3);

        data.node = svg.append("g")
            .attr('class', 'node_circle')
            .attr("stroke", "#ddd")
            .attr("stroke-width", 1.5)
        .selectAll("circle")
            .enter()
            .data(data.nodes)
            .join("circle")
            .attr("r", d => 4 * Math.sqrt(d.reviews.length))
            .attr("fill", "#777")
            .call(drag(simulation));

        simulation.on("tick", () => {
            data.link
                .attr("x1", d => Math.max(30, Math.min(1200 - 30, d.source.x)))
                .attr("y1", d => Math.max(30, Math.min(1000 - 30, d.source.y)))
                .attr("x2", d => Math.max(30, Math.min(1200 - 30, d.target.x)))
                .attr("y2", d => Math.max(30, Math.min(1000 - 30, d.target.y)));

            data.node
                .attr("cx", d => Math.max(30, Math.min(1200 - 30, d.x)))
                .attr("cy", d => Math.max(30, Math.min(1000 - 30, d.y)))
                .on("mouseover", showDetails)
                .on("mouseout", hideDetails);
        });
    }

    mouseover_genre = function(e, d) {
        svg2.select("g.chord_outer").selectAll("g")
            .style("opacity", x => d.index === x.index ? 1.0:0.3)

        svg2.select("g.chord_text").selectAll("g")
            .style("opacity", x => d.index === x.index ? 1.0:0.3)

        svg2.select("g.chord_links").selectAll("path")
            .style("opacity", x => x.source.index === d.index || x.target.index === d.index ? 1.0:0.3)
    }

    mouseout_genre = function(e, d) {
        if(filtered_genre) {
            svg2.select("g.chord_outer").selectAll("g")
                .style("opacity", x => data.genresOrdered[x.index][0] === filtered_genre ? 1.0:0.3)

            svg2.select("g.chord_text").selectAll("g")
                .style("opacity", x => data.genresOrdered[x.index][0] === filtered_genre ? 1.0:0.3)

            svg2.select("g.chord_links").selectAll("path")
                .style("opacity", x => data.genresOrdered[x.source.index][0] === filtered_genre || data.genresOrdered[x.target.index][0] === filtered_genre ? 1.0:0.3)
        }
        else {
            svg2.select("g.chord_outer").selectAll("g")
                .style("opacity", 1.0)

            svg2.select("g.chord_text").selectAll("g")
                .style("opacity", 1.0)

            svg2.select("g.chord_links").selectAll("path")
                .style("opacity", 0.3)
        }
    }

    filter_genre = function(e, d) {
        if(filtered_genre === data.genresOrdered[d.index][0]) {
            filtered_genre = null

            filtered_nodes = data.allNodes
            filtered_links = data.allLinks
        }
        else {
            filtered_genre = data.genresOrdered[d.index][0];
            let filteredReviews = data.reviews.filter(l => {
                return l.source.genres.map(g => g.id).indexOf(filtered_genre) !== -1 &&
                l.target.genres.map(g => g.id).indexOf(filtered_genre) !== -1
            })

            let nodeData = getNodeData(filteredReviews, data.movies)
            filtered_nodes = nodeData.nodes
            filtered_links = nodeData.links
        }

        data.node = data.node
            .data(filtered_nodes, d => d.id)
            .join(enter => enter.append("circle")
                .attr("r", d => 4 * Math.sqrt(d.reviews.length))
                .attr("fill", "#777")
                .call(drag(simulation)));

        data.link = data.link
            .data(filtered_links, d => [d.source, d.target])
            .join("line")
            .attr("stroke-width", 3);

        simulation.nodes(filtered_nodes);
        simulation.force("link").links(filtered_links);
        simulation.alpha(1).restart();
    }

    chord_diagram = function() {
        const chord_matrix = getChordMatrix(data.nodes, data.genres)

        var res = d3.chord()
            .padAngle(0.05)
            .sortSubgroups(d3.descending)
            (chord_matrix)

        //https://observablehq.com/@d3/color-schemes
        colors = d3.schemeCategory10

        // add the groups on the outer part of the circle
        svg2
          .datum(res)
          .append("g")
          .attr("class", "chord_outer")
          .selectAll("g")
          .data(function(d) { return d.groups; })
          .enter()
          .append("g")
          .append("path")
            .style("fill", (d, k) => colors[d.index % 10])
            .style("stroke", (d, k) => colors[d.index % 10])
            .attr("d", d3.arc()
              .innerRadius(230)
              .outerRadius(260)
            )
            .on("mouseover", mouseover_genre)
            .on("mouseout", mouseout_genre)
            .on("click", filter_genre)

        svg2
          .datum(res)
          .append("g")
          .attr("class", "chord_text")
          .selectAll("g")
          .data(function(d) { return d.groups; })
          .enter()
          .append("g")
          .append("text")
            .text(d => genresOrdered[d.index][1].name)
            .attr("x", d => 270 * Math.sin((d.startAngle + d.endAngle) / 2) + (d.index >= 17 ? 30 * (d.index - 18):0))
            .attr("y", d => 270 * -Math.cos((d.startAngle + d.endAngle) / 2) + (d.index >= 17 ? -20:0))
            .attr("text-anchor", d => {
                angle = (d.startAngle + d.endAngle) / 2
                if (Math.sin(angle) < -1/3) return "end";
                if (Math.sin(angle) > 1/3) return "start";
                return "middle"
            })
            .attr("alignment-baseline", d => {
                angle = (d.startAngle + d.endAngle) / 2
                if (-Math.cos(angle) < -1/3) return "baseline";
                if (-Math.cos(angle) > 1/3) return "hanging";
                return "middle"
            })
            .on("mouseover", mouseover_genre)
            .on("mouseout", mouseout_genre)
            .on("click", filter_genre)
          .select(function() {
            return this.parentNode;
          })
          .append("line")
            .attr("x1", d => 270 * Math.sin((d.startAngle + d.endAngle) / 2))
            .attr("y1", d => 270 * -Math.cos((d.startAngle + d.endAngle) / 2))
            .attr("x2", d => 270 * Math.sin((d.startAngle + d.endAngle) / 2) + (d.index >= 17 ? 30 * (d.index - 18):0))
            .attr("y2", d => 270 * -Math.cos((d.startAngle + d.endAngle) / 2) + (d.index >= 17 ? -15:0))
            .attr("stroke", "black")
            .attr("stroke-width", 1.0)

        // Add the links between groups
        svg2
          .datum(res)
          .append("g")
          .attr("class", "chord_links")
          .selectAll("path")
          .data(function(d) { return d; })
          .enter()
          .append("path")
            .attr("d", d3.ribbon()
              .radius(230)
            )
            .style("fill", (d, k) => colors[d.source.index % 10])
            .style("stroke", (d, k) => colors[d.source.index % 10])
            .style("opacity", 0.3)
    }

    histogram_chart = function() {
        var margin = {top: 30, right: 30, bottom: 50, left: 60},
            width = 800 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;

        var x = d3.scaleLinear()
            .domain([0.25, 5.25])     // can use this instead of 1000 to have the max of data: d3.max(data, function(d) { return +d.price })
            .range([0, width]);
        svg3.append("g")
            .attr("transform", "translate(" + margin.left + "," + (height + margin.top) + ")")
            .call(d3.axisBottom(x).tickValues([0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0]));

        svg3.append("text")
            .attr("transform", "translate(" + (margin.left) + "," + (margin.top - 10) + ")")
            .attr("text-anchor", "middle")
            .text("# of Reviews")

        svg3.append("text")
            .attr("transform", "translate(" + (margin.left + width / 2) + "," + (height + margin.top + margin.bottom - 15) + ")")
            .attr("text-anchor", "middle")
            .text("Ratings")

        // set the parameters for the histogram
        var histogram = d3.histogram()
            .value(function(d) { return +d.rating; })   // I need to give the vector of value
            .domain(x.domain())  // then the domain of the graphic
            .thresholds(x.ticks(10)); // then the numbers of bins

        // And apply this function to data to get the bins

        let revs = data.links.reduce(function(arr, obj) {
            arr = arr.concat(obj.reviews)
            return arr
        }, []);

        var bins = histogram(revs);
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
              .attr("x", 6)
              .attr("transform", function(d) { return "translate(" + (x(d.x0 - 0.25) + margin.left) + "," + (y(d.length) + margin.top) + ")"; })
              .attr("width", function(d) { return width / 10 - 16; })
              .attr("height", function(d) { return height - y(d.length); })
              .style("fill", "#69b3a2")
    }

    node_link_chart();
    chord_diagram();
    histogram_chart();
})

function getMovieData(metadataFile, linksFile) {
    let movie_data = metadataFile.reduce(function(map, obj) {
        obj.genres = JSON.parse(obj.genres.replace(/'/g, '"'));
        if(typeof obj.genres === 'undefined') {
            obj.genres = []
        }
        map.set(obj.id, obj);
        return map;
    }, new Map());

    let movies = linksFile.reduce(function(map, obj) {
        if(movie_data.has(obj.tmdbId)) {
            let temp = movie_data.get(obj.tmdbId)
            temp.tmdbId = temp.id;
            temp.id = obj.movieId;
            temp.reviews = [];
            map.set(obj.movieId, temp);
        }
        return map;
    }, new Map());

    return movies;
}

function getGenreData(movies) {
    let genres = new Map();
    movies.forEach(function(m) {
        m.genres.forEach(function(g) {
            if(!genres.has(g.id)) {
                genres.set(g.id, g)
            }
        })
    });

    let genresOrdered = Array.from(genres.entries())
    genresOrdered.sort((a, b) => a[1].name.localeCompare(b[1].name))
    genresOrdered.forEach((g, k) => {
        g[1].index = k
        genres.set(g[0], g[1]);
    })

    return {
      genres: genres,
      genresOrdered: genresOrdered
    }
}

function getGroups(reviewsFile) {
    let groups = d3.group(reviewsFile, d => d.userId);
    return Array.from(groups.values()).slice(0, 200);
}

function getSameReviews(groups, movies) {
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

    let flat_same_reviews = [];
    same_reviews.forEach(function(d, k) {
        d.forEach(function(d2, k2) {
            if(k < k2 && movies.has(k) && movies.has(k2)) {
                flat_same_reviews.push({
                    source: movies.get(k),
                    target: movies.get(k2),
                    reviews: d2
                });
            }
        })
    })
    flat_same_reviews.sort((a, b) => b.reviews.length - a.reviews.length)

    return flat_same_reviews
}

function updateMovies(movies, groups) {
    groups.forEach(function(d) {
        d.forEach(function(review) {
            if(movies.has(review.movieId)) {
                temp = movies.get(review.movieId)
                temp.reviews.push(review)
                movies.set(review.movieId, temp)
            }
        })
    })

    return movies;
}

function getNodeData(reviews, movies) {
    let links = reviews.slice(0, 100)
    let nodes = Array.from(links.reduce(function(set, obj) {
        set.add(movies.get(obj.source.id))
        set.add(movies.get(obj.target.id))

        return set
    }, new Set()))

    return {
        links: links,
        nodes: nodes
    }
}

function getChordMatrix(movies, genres) {
    matrix = [];
    for(var i = 0; i < genres.size; i++) {
        matrix.push(Array.from({length: genres.size}).fill(0))
    }

    movies.forEach(function(m) {
        m.genres.forEach(function(g1) {
            m.genres.forEach(function(g2) {
                k1 = genres.get(g1.id).index
                k2 = genres.get(g2.id).index
                if(k1 <= k2) {
                    matrix[k1][k2]++;
                }
            })
        })
    })

    return matrix
}
