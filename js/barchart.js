const DISASTER_TYPE_TO_DESCRIPTION = new Map(
  [["Biological", "A hazard caused by the exposure to living organisms and their toxic substances (e.g. venom, mold) or vector-borne \
  diseases that they may carry. Examples are venomous wildlife and insects, poisonous plants, and mosquitoes carrying \
  disease-causing agents.\n\
  Main subtypes: Epidemic, Insect infestation."],
  ["Climatological", "A hazard caused by long-lived, meso- to macro-scale atmospheric processes ranging from intra-seasonal to \
  multi-decadal climate variability. \n\
  Main subtypes: Drought, Glacial Lake Outburst, Wildfire."],
  ["Hydrological", "A hazard caused by the occurrence, movement, and distribution of surface and subsurface freshwater and saltwater.\n\
  Main subtypes: Flood, Landslide, Wave action."],
  ["Meteorological", "A hazard caused by short-lived, micro- to meso-scale extreme weather and atmospheric conditions that last from \
  minutes to days. Main subtypes: Extreme Temperature and Storm."]
]);


// Parse the Data
d3.csv("data/EMDAT_disasters_barchart.csv").then( function(data) {
    // set the dimensions and margins of the graph
    const margin = {top: 10, right: 30, bottom: 20, left: 50},
        width = 600,
        height = 300;
    
    // append the barSvg object to the body of the page
    const barSvg = d3.select("#bar")
      .append("center")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform",`translate(${margin.left},${margin.top})`);

  // List of subgroups = header of the csv files = years
  const subgroups = data.columns.slice(1)

  // List of groups = Disaster Subgroups = value of the first column
  const groups = data.map(d => d["Disaster Subgroup"])

  // Add X axis
  const x = d3.scaleBand()
      .domain(groups)
      .range([0, width])
      .padding([0.2]);
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
      .on("mouseover", mouseoverBar)
      .on("mousemove", mousemoveBar)
      .on("mouseout", mouseoutBar)
    .selectAll("rect")
    .data(function(d) { return subgroups.map(function(key) { return {key: key, value: d[key]}; }); })
    .join("rect")
      .attr("id", "bars")
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

  // y label
  barSvg.append("text")
    .attr("class", "y label")
    .attr("text-anchor", "end")
    .attr("y", -50)
    .attr("dy", ".75em")
    .attr("x", -margin.top)
    .attr("transform", "rotate(-90)")
    .text("Frequency")
    .style('font-size', '15px');
  
  // title of the visualization
  barSvg.append("text")
    .attr("x", (width / 2))             
    .attr("y", margin.top)
    .attr("text-anchor", "middle")  
    .style("font-size", "12px") 
    .style("font-weight", 700)
    .text("Evolution of frequency of main disaster types in the last 50 years");

})

function mouseoverBar() {
  // make the other bars more transparent
  d3.selectAll("#bars")
    .style("opacity", 0.5)

  // highlight the selected bar
  d3.select(this).selectAll("#bars")
    .style("opacity", 1)
    .style("stroke", "black")
    .style("stroke-width", 2)

  // add tooltip
  Tooltip
    .style("opacity", 1)
}

function mousemoveBar(event, d) {
  let string = DISASTER_TYPE_TO_DESCRIPTION.get(d["Disaster Subgroup"])
  Tooltip
    .html(string)
    .style("left", (event.pageX+30) + "px")
    .style("top", (event.pageY) + "px")
    .style("height", Math.floor(string.length / 2) + "px");
}

function mouseoutBar() {
  // make all the bars visible again
  d3.selectAll("#bars")
    .style("opacity", 1)

  // undo the highlight of the selected bar
  d3.select(this).selectAll("#bars")
    .style("stroke-width", null);

  // remove the tooltip
  Tooltip
    .style("opacity", 0)
}