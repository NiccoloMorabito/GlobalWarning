const parseTime = d3.timeParse("%Y");
const BIG_CATEGS = ["WORLD", "ANNEXI", "NONANNEXI", "BASIC", "UMBRELLA", "EUU", "LDC", "AOSIS"]

// load the data
d3.csv("../data/CW_emissions.csv", d => {
  return {
    'country': d.country,
    'gas': d.gas,
    'sector': d.sector,
    'value': +d["value (MtCO2e)"],
    'year': +d.year,
    'date': parseTime(+d.year)
  }
}).then(data => {
  // Filter the data
  newData = data.filter(d => d.gas === "KYOTOGHG")
      .filter(d => d.sector === "Total excluding LULUCF")
      .filter(d => BIG_CATEGS.includes(d.country) );

  const countries = data.map(d => d.country);
  const color = d3.scaleOrdinal()
  .domain(countries)
  .range(d3.schemeTableau10);

  // Plot the line chart
  createLineChart(newData, color);
})

const createLineChart = (data, color) => {
  // Set the dimensions and margins of the graph
  const width = 500, height = 300;
  const margins = {top: 20, right: 100, bottom: 80, left: 60};

  // Create the SVG container
  const svg = d3.select("#line")
    .append("svg")
    .attr("viewBox", [0, 0, width, height]);


  // Define x-axis, y-axis, and color scales
  const yScale = d3.scaleLinear()
    .domain([0, d3.max(data, d=>d.value)])
    .range([height - margins.bottom, margins.top]);

  const xScale = d3.scaleTime()
    .domain(d3.extent(data, d => d.date))
    .range([margins.left, width - margins.right]); 

  const line = d3.line()
    .curve(d3.curveLinear)
    .x(d => xScale(d.date))
    .y(d => yScale(d.value));

  // Group the data for each big category
  const group = d3.group(data, d => d.country);

  // Create line paths for each country
  const path = svg.selectAll('path')
    .data(group)
    .join('path')
      .attr('d', ([i, d]) => line(d))
      .style('stroke', ([i, d]) => color(i))
      .style('stroke-width', 2)
      .style('fill', 'transparent')
      .style('opacity', 0.8);

  // Add the tooltip when hover on the line
  path.append('title').text(([i, d]) => i);

  // x-axis
  const xAxis = d3.axisBottom(xScale);
  svg.append("g")
    .attr("transform", `translate(0,${height - margins.bottom})`)
    .call(xAxis);

  // y-axis
  const yAxis = d3.axisLeft(yScale);
  svg.append("g")
    .attr("transform", `translate(${margins.left},0)`)
    .call(yAxis)

  // label for each line
  const lastData = data.filter(data => data.year === 2019);
  svg.selectAll('text.label')
    .data(lastData)
    .join('text')
      .attr('x', width - margins.right + 5)
      .attr('y', d => yScale(d.value))
      .attr('dy', '0.35em')
      .style('font-size', '7px')
      .style('font-family', 'sans-serif')
      .style('fill', d => color(d.country))
    .text(d => d.country);
  
  // x label
  svg.append("text")
    .attr("class", "x label")
    .attr("text-anchor", "end")
    .attr("x", width-100)
    .attr("y", height-40)
    .style('font-size', '12px')
    .text("Year");
  
  // y label
  svg.append("text")
    .attr("class", "y label")
    .attr("text-anchor", "end")
    .attr("y", 0)
    .attr("dy", ".75em")
    .attr("x", -margins.top)
    .attr("transform", "rotate(-90)")
    .text("GHG emissions value (MtCO2e)")
    .style('font-size', '12px');
}