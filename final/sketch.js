/* https://observablehq.com/@d3/force-directed-graph */
/* https://flowingdata.com/2012/08/02/how-to-make-an-interactive-network-visualization/ */
/* https://www.d3-graph-gallery.com/graph/chord_colors.html */
/* http://bl.ocks.org/sjengle/5432087     Place nodes in circle */

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
    .attr("viewBox", [-600, -500, 1200, 1000])
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
    .force("center", d3.forceCenter(0, 0));

filtered_genre = null;
filtered_review = null;

linkedByIndex = {}
neighboring = (a, b) => {
    return linkedByIndex[a.id + "," + b.id] || linkedByIndex[b.id + "," + a.id]
}

Promise.all([d3.csv("data/movies_metadata.csv"), d3.csv("data/ratings_smaller.csv"), d3.csv("data/links_small.csv")]).then(function(files) {
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
        links: nodeData.links,
        node_link: {},
        histogram: {},
        chord: {}
    };

    showMovieDetails = (i, d) => {
        content = '<p class="main center">' + d.title + '</p>'
        content += '<p class="sub center">' + d.genres.map(v => v.name).join(' ') + '</p>'
        review_count = d.reviews.filter(v => filtered_review == null || filtered_review.indexOf(+v.rating) !== -1).length
        if(review_count > 0) {
            content += '<p class="sub">Avg rating: '+d3.mean(d.reviews.filter(v => filtered_review == null || filtered_review.indexOf(+v.rating) !== -1).map(v => +v.rating)).toFixed(2)+''

            content += ' out of ' + review_count + '</p>'
        }
        else {
            content += '<p class="sub">No ratings</p>'
        }
        content += '<p class="small">' + d.overview + '</p>'

        tooltip
            .style("top", (i.pageY + 15) + "px")
            .style("left", (i.pageX + 15) + "px")
            .style("visibility", "visible")
            .html(content);

        if(data.link) {
            data.link.attr("stroke", (l) => l.source == d || l.target == d ? "#555" : "#999")
                .attr("stroke-opacity", (l) => l.source == d || l.target == d ? 1.0 : 0.2)
        }

        data.node.style("stroke", (n) => neighboring(d, n) ? "#333" : "#ddd")
            .style("stroke-width", (n) => neighboring(d, n) ? 2.0 : 1.0)
            .attr("opacity", (n) => neighboring(d, n) ? 1.0: 0.3)

        d3.select(i.target.parentNode).style("stroke","black")
            .style("stroke-width", 2.0)
            .attr("opacity", 1.0)
    }

    hideMovieDetails = (d,i) => {
        tooltip.style("visibility", "hidden")

        data.node.style("stroke", "#ddd")
            .style("stroke-width", 1.5)
            .attr("opacity", 1.0)

        if(data.link)
            data.link.attr("stroke", "#999")
                .attr("stroke-opacity", 0.6)
    }

    node_link_chart = function() {
        simulation.nodes(data.nodes)
            .force("link", d3.forceLink(data.links).id(d => d.id).strength(0))

        // use to scale node index to theta value
        var scale = d3.scaleLinear()
            .domain([0, data.nodes.length])
            .range([0, 2 * Math.PI]);

        var radius = d3.scalePow()
            .exponent(0.5)
            .domain([0, d3.max(data.nodes.map(d => d.reviews.length))])
            .range([0, 28])

        svg.append("text")
            .attr("transform", "translate(-470,-400)")
            .attr("text-anchor", "middle")
            .attr("fill", "black")
            .text("# of Reviews")

        svg.append("a")
            .attr("transform", "translate(-600,495)")
            .attr("fill", "black")
            .attr("href", "https://www.kaggle.com/rounakbanik/the-movies-dataset")
            .attr("target", "_blank")
            .append("text")
                .text("Data Source: https://www.kaggle.com/rounakbanik/the-movies-dataset")

        svg.append("g")
            .attr("class", "legend")
            .attr("transform", "translate(-570,-470)")
            .attr("text-anchor", "middle")
            .selectAll("g")
                .data([100, 50, 25, 10, 5])
                .join("g")
                .append("circle")
                    .attr("r", d => radius(d))
                    .attr("cx", (d, i) => 50 * i)
                    .attr("cy", (d, i) => 35 - radius(d))
                    .attr("fill", "#777")
                    .select(function() {
                      return this.parentNode;
                    })
                .append("text")
                    .attr("dx", (d, i) => 50 * i)
                    .attr("dy", 50)
                    .text(d => d)

        // calculate theta for each node
        data.nodes.forEach(function(d, i) {
            // calculate polar coordinates
            var theta  = scale(i);
            var radial = 250;

            // convert to cartesian coordinates
            d.x = radial * Math.sin(theta);
            d.y = - radial * Math.cos(theta);
            d.angle = theta;
            d.radius = radius(d.reviews.length); //2 * Math.sqrt(d.reviews.length);
            d.offsetX = (radial + d.radius) * Math.sin(theta);
            d.offsetY = - (radial + d.radius) * Math.cos(theta);
        });

        data.node = svg.append("g")
            .attr('class', 'node_circle')
            .attr("stroke", "#ddd")
            .attr("stroke-width", 1.5)
        .selectAll("g")
            .enter()
            .data(data.nodes)
            .join("g")
              .attr("transform", d => `translate(${d.x},${d.y}) rotate(${d.angle * 180 / Math.PI - 90})`)
            .append("circle")
              .attr("cx", d => d.radius)
              .attr("r", d => d.radius)
              .attr("fill", "#777")
              .on("mouseover", showMovieDetails)
              .on("mouseout", hideMovieDetails)
              .select(function() {
                return this.parentNode;
              })
            .append("text")
              .attr("dy", "0.31em")
              .attr("x", d => d.angle < Math.PI ? 2 * d.radius + 6 : -2 * d.radius - 6)
              .attr("text-anchor", d => d.angle < Math.PI ? "start" : "end")
              .attr("transform", d => d.angle >= Math.PI ? "rotate(180)" : null)
              .attr("stroke", "none")
              .attr("fill", "#000")
              .text(d => d.title)
              .on("mouseover", showMovieDetails)
              .on("mouseout", hideMovieDetails)
              .select(function() {
                return this.parentNode;
              })

        data.link = svg.append("g")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.5)
        .selectAll("path")
            .enter()
            .data(data.links)
            .join("path")
            .attr("stroke-width", 3)
            .attr("fill", "none")
              .attr("d", linkCurve);

        data.node_link.radius = radius
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
        }
        else {
            filtered_genre = data.genresOrdered[d.index][0];
        }

        let filteredReviews = data.reviews
        if(filtered_genre) {
            filteredReviews = filteredReviews.filter(l => {
                return l.source.genres.map(g => g.id).indexOf(filtered_genre) !== -1 &&
                l.target.genres.map(g => g.id).indexOf(filtered_genre) !== -1
            })
        }

        let nodeData = getNodeData(filteredReviews, data.movies, filtered_genre)
        filtered_nodes = nodeData.nodes
        filtered_links = nodeData.links

        redraw_node_link(filtered_nodes, filtered_links)
        redraw_histogram(filtered_genre)
    }

    filter_review = function(event) {
        if (event.sourceEvent.type === "brush") return;

        if(event.selection) {
            new_filter = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0].filter(v =>
                data.histogram.x(v + 0.25) + data.histogram.margin.left - 8 > event.selection[0] &&
                data.histogram.x(v - 0.25) + data.histogram.margin.left + 8 < event.selection[1]
            )
            if(new_filter.length == 0) {
                new_filter = null
            }
        }
        else {
            new_filter = null
        }

        svg3.selectAll("rect.bin")
            .style("fill", d => new_filter == null ||
                (data.histogram.x(d.x0 + 0.25) + data.histogram.margin.left - 8 > event.selection[0] &&
                data.histogram.x(d.x0 - 0.25) + data.histogram.margin.left + 8 < event.selection[1]) ?
                "#69b3a2":"lightgray")

        if(!arrayEquality(filtered_review, new_filter)) {
            filtered_review = new_filter
        }

        if(event.type === "end") {
            let filteredReviews = data.reviews
            if(filtered_genre) {
                filteredReviews = filteredReviews.filter(l => {
                    return l.source.genres.map(g => g.id).indexOf(filtered_genre) !== -1 &&
                    l.target.genres.map(g => g.id).indexOf(filtered_genre) !== -1
                })
            }

            let nodeData = getNodeData(filteredReviews, data.movies, filtered_genre)
            filtered_nodes = nodeData.nodes
            filtered_links = nodeData.links

            redraw_node_link(filtered_nodes, filtered_links)
        }
    }

    chord_diagram = function() {
        var chord_matrix = getChordMatrix(data.movies, data.genres)

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

        data.chord.matrix = chord_matrix;
        data.chord.groups = res;
    }

    histogram_chart = function() {
        var margin = {top: 30, right: 30, bottom: 50, left: 60},
            width = 800 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;

        var x = d3.scaleLinear()
            .domain([0.25, 5.25])
            .range([0, width]);

        svg3.append("g")
            .attr("transform", "translate(" + margin.left + "," + (height + margin.top) + ")")
            .call(
                d3.axisBottom(x)
                    .tickValues([0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0])
            );

        svg3.append("text")
            .attr("transform", "translate(" + (margin.left) + "," + (margin.top - 10) + ")")
            .attr("text-anchor", "middle")
            .attr("fill", "black")
            .text("# of Reviews")

        svg3.append("text")
            .attr("transform", "translate(" + (margin.left + width / 2) + "," + (height + margin.top + margin.bottom - 15) + ")")
            .attr("text-anchor", "middle")
            .attr("fill", "black")
            .text("Ratings")

        // set the parameters for the histogram
        hist = d3.histogram()
            .value(function(d) { return +d.rating; })   // I need to give the vector of value
            .domain(x.domain())  // then the domain of the graphic
            .thresholds(x.ticks(10)); // then the numbers of bins

        // And apply this function to data to get the bins

        movies = Array.from(data.movies.entries())
        let revs = movies.reduce(function(arr, obj) {
            arr = arr.concat(obj[1].reviews)
            return arr
        }, []);

        var bins = hist(revs);
        bins = bins.filter(d => d.x1 != d.x0)

        // Y axis: scale and draw:
        var y = d3.scaleLinear()
            .range([height, 0]);
        y.domain([0, d3.max(bins, function(d) { return d.length; })]);   // d3.hist has to be called before the Y axis obviously

        svg3.append("g")
            .attr("class", "y-axis")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .call(d3.axisLeft(y));

        // append the bar rectangles to the svg element
        svg3.selectAll("rect")
            .data(bins)
            .enter()
            .append("rect")
              .attr("class", "bin")
              .attr("x", 6)
              .attr("transform", function(d) { return "translate(" + (x(d.x0 - 0.25) + margin.left) + "," + (y(d.length) + margin.top) + ")"; })
              .attr("width", function(d) { return width / 10 - 16; })
              .attr("height", function(d) { return height - y(d.length); })
              .style("fill", "#69b3a2")

        svg3.call(d3.brushX().extent([[margin.left, margin.top], [margin.left + width, margin.top + height]]).on("brush end", filter_review));

        data.histogram.margin = margin
        data.histogram.width = width
        data.histogram.height = height
        data.histogram.x = x
        data.histogram.y = y
        data.histogram.hist = hist
        data.histogram.bins = bins
    }

    node_link_chart();
    chord_diagram();
    histogram_chart();
    annotations()
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
            temp.users = [];
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
                g.movies = []
                genres.set(g.id, g)
            }
            genres.get(g.id).movies.push(m)
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
    return Array.from(groups.values()).slice(0, 200)  ;
}

function getSameReviews(groups, movies) {
    let same_reviews = groups.reduce(function(map, obj) {
        obj.forEach(function(d1, k1) {
            submap = obj.slice(k1 + 1).reduce(function(map2, obj2, k2) {
                if(map2.has(obj2.movieId)) {
                    map2.get(obj2.movieId).push(obj2);
                }
                else {
                    map2.set(obj2.movieId, [obj2]);
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

function getNodeData(reviews, movies, genre = null) {
    linkedByIndex = {}
    let links = reviews.slice(0, 100)
    let nodes = links.reduce(function(set, obj) {
        linkedByIndex[obj.source.id + "," + obj.target.id] = 1

        set.add(movies.get(obj.source.id))
        set.add(movies.get(obj.target.id))

        return set
    }, new Set())

    if(nodes.size === 0) {
        if(genre) {
            sub_movies = Array.from(movies.entries()).filter(v => v[1].genres.map(g => g.id).indexOf(genre) !== -1)
        }
        else {
            sub_movies = Array.from(movies.entries())
        }

        sub_movies.forEach(v => nodes.add(v[1]))
    }

    nodes = Array.from(nodes)
    nodes.sort((a, b) => a.title.localeCompare(b.title))

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

    movies = Array.from(movies.entries()).map(v => v[1])
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

function linkCurve(d) {
    var lineData = [{
        x: Math.round(d.target.x),
        y: Math.round(d.target.y)
    }, {
        x: 2/3 * Math.round(d.target.x),
        y: 2/3 * Math.round(d.target.y),
    }, {
        x: 2/3 * Math.round(d.source.x),
        y: 2/3 * Math.round(d.source.y),
    }, {
        x: Math.round(d.source.x),
        y: Math.round(d.source.y)
    }];

    return `M${lineData[0].x},${lineData[0].y}C${lineData[1].x},${lineData[1].y},${lineData[2].x},${lineData[2].y},${lineData[3].x},${lineData[3].y} `;
}

function redraw_histogram(genre) {
    var duration = 300

    if(genre) {
        movies = Array.from(data.movies.entries()).filter(v => v[1].genres.map(g => g.id).indexOf(genre) !== -1)
    }
    else {
        movies = Array.from(data.movies.entries())
    }
    let revs = movies.reduce(function(arr, obj) {
        arr = arr.concat(obj[1].reviews)
        return arr
    }, []);

    var bins = data.histogram.hist(revs);
    bins = bins.filter(d => d.x1 != d.x0)

    var old_max = d3.max(data.histogram.bins, function(d) { return d.length; })
    var new_max = d3.max(bins, function(d) { return d.length; })

    var x = data.histogram.x
    var old_y = data.histogram.y
    var new_y = d3.scaleLinear()
        .range([data.histogram.height, 0])
        .domain([0, new_max]);

    if(old_max < new_max) {
        svg3.select("g.y-axis")
            .transition()
            .duration(duration)
            .call(d3.axisLeft(new_y));

        svg3.selectAll("rect")
            .data(data.histogram.bins)
              .transition()
              .duration(duration)
              .attr("transform", function(d) { return "translate(" + (x(d.x0 - 0.25) + data.histogram.margin.left) + "," + (new_y(d.length) + data.histogram.margin.top) + ")"; })
              .attr("height", function(d) { return data.histogram.height - new_y(d.length); })

        // append the bar rectangles to the svg element
        setTimeout(function() {
            svg3.selectAll("rect")
                .data(bins)
                  .transition()
                  .duration(duration)
                  .attr("transform", function(d) { return "translate(" + (x(d.x0 - 0.25) + data.histogram.margin.left) + "," + (new_y(d.length) + data.histogram.margin.top) + ")"; })
                  .attr("height", function(d) { return data.histogram.height - new_y(d.length); })
        }, duration)
    }
    else {
        // append the bar rectangles to the svg element
        svg3.selectAll("rect")
            .data(bins)
              .transition()
              .duration(duration)
              .attr("transform", function(d) { return "translate(" + (x(d.x0 - 0.25) + data.histogram.margin.left) + "," + (old_y(d.length) + data.histogram.margin.top) + ")"; })
              .attr("height", function(d) { return data.histogram.height - old_y(d.length); })

        setTimeout(function() {
            svg3.select("g.y-axis")
                .transition()
                .duration(duration)
                .call(d3.axisLeft(new_y));

            svg3.selectAll("rect")
                .data(bins)
                  .transition()
                  .duration(duration)
                  .attr("transform", function(d) { return "translate(" + (x(d.x0 - 0.25) + data.histogram.margin.left) + "," + (new_y(d.length) + data.histogram.margin.top) + ")"; })
                  .attr("height", function(d) { return data.histogram.height - new_y(d.length); })

            data.histogram.bins = bins
            data.histogram.y = new_y
        }, duration)
    }

    data.histogram.bins = bins
    data.histogram.y = new_y

    annotations()
}

function redraw_node_link(filtered_nodes, filtered_links) {
    var scale = d3.scaleLinear()
        .domain([0, filtered_nodes.length])
        .range([0, 2 * Math.PI]);

    // calculate theta for each node
    filtered_nodes.forEach(function(d, i) {
                               // calculate polar coordinates
                               var theta  = scale(i);
                               var radial = 250;

                               // convert to cartesian coordinates
                               d.x = radial * Math.sin(theta);
                               d.y = - radial * Math.cos(theta);
                               d.angle = theta;
                               d.radius = data.node_link.radius(d.reviews.filter(v => filtered_review == null || filtered_review.indexOf(+v.rating) !== -1).length);
                               d.offsetX = (radial + d.radius) * Math.sin(theta);
                               d.offsetY = - (radial + d.radius) * Math.cos(theta);
                           });

    data.node = data.node
        .data(filtered_nodes, d => d.id)
        .join(enter => enter.append("g")
                .attr("transform", d => `translate(${d.x},${d.y}) rotate(${d.angle * 180 / Math.PI - 90})`)
              .append("circle")
                .attr("cx", d => d.radius)
                .attr("r", d => d.radius)
                .attr("fill", "#777")
                .on("mouseover", showMovieDetails)
                .on("mouseout", hideMovieDetails)
                .select(function() {
                  return this.parentNode;
                })
              .append("text")
                .attr("dy", "0.31em")
                .attr("x", d => d.angle < Math.PI ? 2 * d.radius + 6 : -2 * d.radius - 6)
                .attr("text-anchor", d => d.angle < Math.PI ? "start" : "end")
                .attr("transform", d => d.angle >= Math.PI ? "rotate(180)" : null)
                .attr("stroke", "none")
                .attr("fill", "#000")
                .text(d => d.title)
                .on("mouseover", showMovieDetails)
                .on("mouseout", hideMovieDetails)
                .select(function() {
                  return this.parentNode;
                }))

    data.node
        .attr("transform", d => `translate(${d.x},${d.y}) rotate(${d.angle * 180 / Math.PI - 90})`)
         .select("circle")
            .attr("cx", d => d.radius)
            .attr("r", d => d.radius)
            .attr("fill", "#777")
            .on("mouseover", showMovieDetails)
            .on("mouseout", hideMovieDetails)
            .select(function() {
              return this.parentNode;
            })
          .select("text")
            .attr("dy", "0.31em")
            .attr("x", d => d.angle < Math.PI ? 2 * d.radius + 6 : -2 * d.radius - 6)
            .attr("text-anchor", d => d.angle < Math.PI ? "start" : "end")
            .attr("transform", d => d.angle >= Math.PI ? "rotate(180)" : null)
            .attr("stroke", "none")
            .attr("fill", "#000")
            .text(d => d.title)
            .on("mouseover", showMovieDetails)
            .on("mouseout", hideMovieDetails)
            .select(function() {
              return this.parentNode;
            })


    data.link = data.link
        .data(filtered_links, d => [d.source, d.target])
        .join("path")
        .attr("stroke-width", 3)
        .attr("fill", "none")
          .attr("d", linkCurve);

    simulation.nodes(filtered_nodes);
    simulation.force("link").links(filtered_links);
}

function arrayEquality(a, b) {
    if(a === b) return true;
    if(a == null || b == null) return false;
    if(a.length !== b.length) return false;

    let equals = true;
    for(var i = 0; i < a.length; i++) {
        if(a[i] !== b[i]) {
            equals = false;
            break;
        }
    }
    return equals;
}

function annotations() {
    /* https://d3-annotation.susielu.com/ */
    const annotations1 = [{
      type: d3.annotationCalloutElbow,
      note: {
        label: "The top movie connections are shown",
      },
      //can use x, y directly instead of data
      x: 400,
      y: -300,
      dx: 50,
      dy: -50,
    }]

    const annotations2 = [{
      type: d3.annotationCalloutElbow,
      note: {
        label: "The largest genre pairing is {Drama and Romance} (1278 movies) followed by {Comedy and Drama} (1236 movies)",
      },
      //can use x, y directly instead of data
      x: -390,
      y: -310,
      dx: 0,
      dy: 0,
    }]

    bins = data.histogram.bins.map(v=>v.length)
    total = d3.sum(bins)
    sum = 0
    rating = 0.5
    for (var i = bins.length-1; i >= 0; i--) {
        sum += bins[i];
        if(sum >= total / 2) {
            rating = i * 0.5
            break;
        }
    }

    const annotations3 = [{
      type: d3.annotationXYThreshold,
      note: {
        label: "Half of total reviews have ratings " + rating.toFixed(1) + " and higher",
      },
      //can use x, y directly instead of data
      x: data.histogram.x(rating - 0.25) + data.histogram.margin.left,
      y: 50,
      dx: - data.histogram.x(rating - 0.25) + 150,
      dy: 0,
      subject: {
        y1: data.histogram.margin.top,
        y2: data.histogram.margin.top + 100
      }
    }]

    const makeAnnotations1 = d3.annotation()
      //also can set and override in the note.padding property
      //of the annotation object
      .notePadding(15)
      .type(d => d.type)
      .annotations(annotations1)

    const makeAnnotations2 = d3.annotation()
      //also can set and override in the note.padding property
      //of the annotation object
      .notePadding(15)
      .type(d => d.type)
      .annotations(annotations2)

    const makeAnnotations3 = d3.annotation()
      //also can set and override in the note.padding property
      //of the annotation object
      .notePadding(15)
      .type(d => d.type)
      .annotations(annotations3)

    main_svg.selectAll("g.annotation-group").remove()

    svg
      .append("g")
      .attr("class", "annotation-group")
      .call(makeAnnotations1)

    svg2
      .append("g")
      .attr("class", "annotation-group")
      .call(makeAnnotations2)

    svg3
      .append("g")
      .attr("class", "annotation-group")
      .call(makeAnnotations3)
}
