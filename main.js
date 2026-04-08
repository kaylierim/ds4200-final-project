// Define dimensions
let width = 750;
let height = 400;

let margin = {
  top: 50,
  bottom: 100,
  left: 60,
  right: 20,
};

// Create SVG
let svg = d3
  .select("body")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .style("background", "#fafafa");

// Load and process data
d3.csv("imdb_top_5000_tv_shows.csv")
  .then(function (data) {
    // Clean and parse the data
    data.forEach((d) => {
      d.averageRating = +d.averageRating;
      d.numVotes = +d.numVotes;
      d.primaryGenre = d.genres ? d.genres.split(",")[0].trim() : "Unknown";
    });

    // Filter out rows with missing ratings
    data = data.filter((d) => !isNaN(d.averageRating));

    // Group data by genre
    let groupedByGenre = d3.group(data, (d) => d.primaryGenre);

    // Calculate box plot statistics for each genre
    let boxData = Array.from(groupedByGenre, ([genre, shows]) => {
      let ratings = shows.map((d) => d.averageRating).sort(d3.ascending);

      let q1 = d3.quantile(ratings, 0.25);
      let q2 = d3.quantile(ratings, 0.5);
      let q3 = d3.quantile(ratings, 0.75);
      let iqr = q3 - q1;
      let min = d3.min(ratings);
      let max = d3.max(ratings);

      let r0 = Math.max(min, q1 - iqr * 1.5);
      let r1 = Math.min(max, q3 + iqr * 1.5);

      let outliers = shows.filter(
        (d) => d.averageRating < r0 || d.averageRating > r1,
      );

      return {
        genre: genre,
        quartiles: [q1, q2, q3],
        range: [r0, r1],
        outliers: outliers,
        count: shows.length,
      };
    });

    // Filter to top 12 genres by count, then sort by median
    let topGenres = boxData
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
      .sort((a, b) => b.quartiles[1] - a.quartiles[1]);

    // Define the scales
    let xScale = d3
      .scaleBand()
      .domain(topGenres.map((d) => d.genre))
      .range([margin.left, width - margin.right])
      .padding(0.3);

    let yScale = d3
      .scaleLinear()
      .domain([0, 10])
      .range([height - margin.bottom, margin.top]);

    let colorScale = d3
      .scaleOrdinal()
      .domain(topGenres.map((d) => d.genre))
      .range(d3.schemeTableau10);

    // Make axes with the scale functions
    let xAxis = svg
      .append("g")
      .call(d3.axisBottom().scale(xScale))
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .attr("text-anchor", "end")
      .attr("dx", "-0.5em")
      .attr("dy", "0.5em");

    let yAxis = svg
      .append("g")
      .call(d3.axisLeft().scale(yScale))
      .attr("transform", `translate(${margin.left}, 0)`);

    // Draw the title
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 25)
      .text("IMDb Rating Distribution by Genre")
      .style("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold");

    // Draw the axis labels
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height - 10)
      .text("Genre")
      .style("text-anchor", "middle")
      .style("font-size", "14px");

    svg
      .append("text")
      .attr("x", 0 - height / 2)
      .attr("y", 20)
      .text("Average Rating")
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .attr("transform", "rotate(-90)");

    // Create a group for each box plot
    let boxes = svg
      .selectAll(".box")
      .data(topGenres)
      .join("g")
      .attr("class", "box")
      .attr("transform", (d) => `translate(${xScale(d.genre)}, 0)`);

    // Draw vertical whisker line
    boxes
      .append("line")
      .attr("x1", xScale.bandwidth() / 2)
      .attr("x2", xScale.bandwidth() / 2)
      .attr("y1", (d) => yScale(d.range[0]))
      .attr("y2", (d) => yScale(d.range[1]))
      .attr("stroke", "black")
      .attr("stroke-width", 1);

    // Draw bottom whisker cap
    boxes
      .append("line")
      .attr("x1", xScale.bandwidth() / 4)
      .attr("x2", (xScale.bandwidth() * 3) / 4)
      .attr("y1", (d) => yScale(d.range[0]))
      .attr("y2", (d) => yScale(d.range[0]))
      .attr("stroke", "black")
      .attr("stroke-width", 1);

    // Draw top whisker cap
    boxes
      .append("line")
      .attr("x1", xScale.bandwidth() / 4)
      .attr("x2", (xScale.bandwidth() * 3) / 4)
      .attr("y1", (d) => yScale(d.range[1]))
      .attr("y2", (d) => yScale(d.range[1]))
      .attr("stroke", "black")
      .attr("stroke-width", 1);

    // Draw the box (Q1 to Q3)
    boxes
      .append("rect")
      .attr("x", 0)
      .attr("y", (d) => yScale(d.quartiles[2]))
      .attr("width", xScale.bandwidth())
      .attr("height", (d) => yScale(d.quartiles[0]) - yScale(d.quartiles[2]))
      .attr("fill", (d) => colorScale(d.genre))
      .attr("fill-opacity", 0.7)
      .attr("stroke", "black")
      .attr("stroke-width", 1);

    // Draw median line
    boxes
      .append("line")
      .attr("x1", 0)
      .attr("x2", xScale.bandwidth())
      .attr("y1", (d) => yScale(d.quartiles[1]))
      .attr("y2", (d) => yScale(d.quartiles[1]))
      .attr("stroke", "black")
      .attr("stroke-width", 2);

    // Draw outliers
    boxes.each(function (d) {
      d3.select(this)
        .selectAll("circle")
        .data(d.outliers)
        .join("circle")
        .attr(
          "cx",
          xScale.bandwidth() / 2 +
            (Math.random() - 0.5) * xScale.bandwidth() * 0.5,
        )
        .attr("cy", (o) => yScale(o.averageRating))
        .attr("r", 3)
        .attr("fill", colorScale(d.genre))
        .attr("fill-opacity", 0.5)
        .attr("stroke", "black")
        .attr("stroke-width", 0.5);
    });
  })
  .catch(function (error) {
    console.log("Error loading data: ", error);
  });
