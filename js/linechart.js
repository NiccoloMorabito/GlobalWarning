const parseTime = d3.timeParse("%Y");
const BIG_CATEGS = ["WORLD", "ANNEXI", "NONANNEXI", "BASIC", "UMBRELLA", "EUU", "LDC", "AOSIS"]
//TODO fix these descriptions
const BIG_CATEG_TO_DESCRIPTION = new Map(
  [["WORLD", "WORLD considers all the countries in the world that have data. The data also includes international bunker fuel related \
  emissions and other territories that release anthropogenic emissions but are not included in the dataset"],
  ["ANNEXI", "Annex I Parties are 43 member states, including the European Union. These countries are classified as industrialized \
  countries and economies in transition. Of these, 24 are Annex II Parties, including the European Union, and 14 are Economies in \
  Transition."],
  //TODO add some example countries in the category; https://en.wikipedia.org/wiki/United_Nations_Framework_Convention_on_Climate_Change#Annex_I_countries
  ["NONANNEXI", "Non-AnnexI includes parties, mostly developing nations, that have ratified or acceded to the United Nations \
  Framework Convention on Climate Change and are not included in Annex I of the Kyoto Protocol. They include mainly South-America, \
  Africa and Asia."],
  ["BASIC", "BASIC includes: Brazil, South Africa, India and China"],
  ["UMBRELLA", "The Umbrella Group (also known as the JUSCANZ) is a negotiation group consisting of 12 parties to the UNFCCC, \
  including: Belarus, Kazakhstan, Russia, Ukraine, Australia, Canada, Iceland, Japan, New Zealand, Norway, United States, Israel"],
  ["EUU", "European Union"],
  ["LDC", "Least Developed Countries (LDC) currently include 46 countries, mostly in Africa (33) and Asia (9)."],
  ["AOSIS", "Alliance of Small Island States (AOSIS) is an intergovernmental organization of low-lying coastal and small island \
  countries. There are 39 member states, mostly in the Caribbean (16) and the Pacific Ocean (15)."]
]);
const BIG_CATEG_TO_LABEL = new Map(
  [["WORLD", "WORLD"],
  ["ANNEXI", "ANNEX I"],
  ["NONANNEXI", "NON-ANNEX I"],
  ["BASIC", "BASIC"],
  ["UMBRELLA", "UMBRELLA"],
  ["LDC", "LDC"],
  ["AOSIS", "AOSIS"]
]);

var Tooltip = d3.select("#line")
  .append("div")
  .style("opacity", 0)
  .style("width", "200px")
  .style("height", "140px")
  .attr("class", "tooltip")
  .style("background-color", "white")
  .style("border", "solid")
  .style("border-width", "2px")
  .style("border-radius", "5px")
  .style("padding", "5px")

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
  svgLine = d3.select("#line")
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
  const path = svgLine.selectAll('path')
    .data(group)
    .join('path')
      .attr('d', ([i, d]) => line(d))
      .style('stroke', ([i, d]) => color(i))
      .style('stroke-width', 2)
      .style('fill', 'transparent')
      .style('opacity', 1)
      .on("mouseover", mouseoverLine)
      .on("mousemove", mousemoveLine)
      .on("mouseout", mouseoutLine)

  // Add the tooltip when hover on the line
  //path.append('title').text(([i, d]) => i);

  // x-axis
  const xAxis = d3.axisBottom(xScale);
  svgLine.append("g")
    .attr("transform", `translate(0,${height - margins.bottom})`)
    .call(xAxis);

  // y-axis
  const yAxis = d3.axisLeft(yScale);
  svgLine.append("g")
    .attr("transform", `translate(${margins.left},0)`)
    .call(yAxis)

  // label for each line
  const lastData = data.filter(data => data.year === 2019);
  svgLine.selectAll('text.label')
    .data(lastData)
    .join('text')
      .attr('x', width - margins.right + 5)
      .attr('y', d => yScale(d.value))
      .attr('dy', '0.35em')
      .style('font-size', '7px')
      .style('font-family', 'sans-serif')
      .style('fill', d => color(d.country))
    .text(d => BIG_CATEG_TO_LABEL.get(d.country));
  
  // x label
  svgLine.append("text")
    .attr("class", "x label")
    .attr("text-anchor", "end")
    .attr("x", width-100)
    .attr("y", height-40)
    .style('font-size', '9px')
    .text("Year");
  
  // y label
  svgLine.append("text")
    .attr("class", "y label")
    .attr("text-anchor", "end")
    .attr("y", 0)
    .attr("dy", ".75em")
    .attr("x", -margins.top)
    .attr("transform", "rotate(-90)")
    .text("GHG emissions value (MtCO2e)")
    .style('font-size', '9px');
}

function mouseoverLine() {
  // make the other lines more transparent
  d3.selectAll('path')
    .style("opacity", 0.5)
  // but not the axis
  d3.selectAll('g > path')
    .style("opacity", 1)

  // make the selected line thicker
  d3.select(this)
    .style("opacity", 1)
    .style("stroke-width", 4)

  // add tooltip
  Tooltip
    .style("opacity", 1)
}

function mousemoveLine(event, d) {
  Tooltip    
    .html(BIG_CATEG_TO_DESCRIPTION.get(d[0]))
    .style("left", (event.pageX+30) + "px")
    .style("top", (event.pageY) + "px")
}

function mouseoutLine() {
  // make all the lines visible again
  d3.selectAll('path')
    .style("opacity", 1)

  // undo thickness of the selected line
  d3.select(this)
    .style("stroke-width", 2);

  // remove tooltip
  Tooltip
    .style("opacity", 0)

}