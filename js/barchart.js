// source: https://d3-graph-gallery.com/graph/barplot_grouped_basicWide.html

// Parse the Data //TODO if you load the same file twice, call this function from the main script
d3.csv("../data/EMDAT_disasters_barchart.csv").then( function(data) {
    // set the dimensions and margins of the graph
    const margin = {top: 10, right: 30, bottom: 20, left: 50},
        width = 460 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;
    
    // append the barSvg object to the body of the page
    const barSvg = d3.select("#bar")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform",`translate(${margin.left},${margin.top})`);


  // Preparing data (done with python so far)
  /*
  // List of disaster groups (showing them on the X axis)
  const dis_groups = data.columns.slice(1)
  df[df["Year"].isin([1970, 2019])].groupby(["Year", "Disaster Subgroup"])["index"].count()
  var filteredData = [];
  data.forEach(function(d) {
    if (+d.Year === 1970 || +d.Year === 2019) {
      filteredData.push(d)
    }
  });
  const grouping = d3.group(filteredData, d => d.country);
  const count = d3.rollup(filteredData, v => v.length, d => d["Disaster Subgroup"])
  */

  // List of subgroups = header of the csv files = years
  const subgroups = data.columns.slice(1)

  // List of groups = Disaster Subgroups = value of the first column
  const groups = data.map(d => d["Disaster Subgroup"])

  // Add X axis
  const x = d3.scaleBand()
      .domain(groups)
      .range([0, width])
      .padding([0.2])
      barSvg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x).tickSize(0));

  // Add Y axis
  const y = d3.scaleLinear()
    .domain([0, 250])
    .range([ height, 0 ]);
  barSvg.append("g")
    .call(d3.axisLeft(y));

  // Another scale for subgroup position?
  const xSubgroup = d3.scaleBand()
    .domain(subgroups)
    .range([0, x.bandwidth()])
    .padding([0.05])

  // color palette = one color per subgroup
  const colors = d3.scaleOrdinal()
    .domain(subgroups)
    .range(d3.schemeTableau10);

  // Show the bars
  barSvg.append("g")
    .selectAll("g")
    // Enter in data = loop group per group
    .data(data)
    .join("g")
      .attr("transform", d => `translate(${x(d["Disaster Subgroup"])}, 0)`)
    .selectAll("rect")
    .data(function(d) { return subgroups.map(function(key) { return {key: key, value: d[key]}; }); })
    .join("rect")
      .attr("x", d => xSubgroup(d.key))
      .attr("y", d => y(d.value))
      .attr("width", xSubgroup.bandwidth())
      .attr("height", d => height - y(d.value))
      .attr("fill", d => colors(d.key));

  // Legend of the bars
  var barsLegend = barSvg.append("g")
    .attr("class", "legend")
    //.attr("x", w - 65)
    //.attr("y", 50)
    .attr("height", 100)
    .attr("width", 100)
    .attr('transform', 'translate(0,0)');

  // rects
  barsLegend.selectAll('rect')
    .data(subgroups)
    .enter()
    .append("rect")
    .attr("width", 10)
    .attr("height", 10)
    .attr("x", width - 70)
    .attr("y", function(d, i) {
        return i * 20;
    })
    .style("fill", function(d) {
        return colors(d);
    });

  // texts
  barsLegend.selectAll('text')
    .data(subgroups)
    .enter()
    .append("text")
    .attr("x", width - 45)
    .attr("y", function(d, i) {
        return i * 20 + 9;
    })
    .text(function(d) {
        return d;
    });

})