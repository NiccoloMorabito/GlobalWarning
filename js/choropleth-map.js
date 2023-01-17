const COUNTRY_BIG_CATEGS = ["WORLD", "ANNEXI", "NONANNEXI", "BASIC", "UMBRELLA", "EUU", "LDC", "AOSIS"]
const START_YEAR = 1850;
const END_YEAR = 2019;

// max value per year per country: 13000
const EMS_QUANTILES = [0, 50, 250, 1000, 5000, 10000]

const pauseIconClassName = 'fa-circle-pause'
const playIconClassName = 'fa-circle-play'

// stuff
var width = 960,
    height = 650;

var svg = d3.select("#map").append("svg")
  .attr("viewBox", [0, 0, width, height]);
const path = d3.geoPath();
const projection = d3.geoMercator()
  .scale(140)
  .center([0,20])
  .translate([width / 2, height / 2 + 80]);
const gMap = svg.append("g");
const zoom = d3.zoom()
.scaleExtent([1, 8])
.translateExtent([[0, 0], [width, height]])
.on('zoom', function zoomed(event) {
  // zoom color countries
  gMap.selectAll('path')
    .attr('transform', event.transform);

  // zoom circles for diasters
  gMap.selectAll('circle')
    .attr("transform", event.transform);
});

const colorScale = d3.scaleThreshold()
  .domain(EMS_QUANTILES)
  .range(d3.schemeBlues[EMS_QUANTILES.length]);

var slider = document.getElementById("yearSlider");
var output = document.getElementById("yearText");
output.innerHTML = slider.value;

slider.oninput = function() {
  output.innerHTML = this.value;
}

// legend TODO fix the background
var legendData = [];
EMS_QUANTILES.forEach(q => {
  legendData.push({"size": EMS_QUANTILES.indexOf(q)*10, "value": q})
});
var legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", "translate(" + (width - 70) + "," + (height - 20) + ")")
    .selectAll("g")
    .data(legendData)
    .enter().append("g");

legend.append('rect')
  .attr('x', -80)
  .attr('y', -140)
  .attr('width', 400) //TODO change these values, they go outside of the borders
  .attr('height', 400)
  .attr('stroke', 'grey')
  .attr('stroke-opacity', 0.1)
  .attr('fill', 'grey')
  .attr('fill-opacity', 0.1);

legend.append("rect")
    .style("fill", function(d, i) {
      return colorScale(d.value)
    })
    .attr("x", 15)
    .attr("y", function(d, i) {
      return - 2 - EMS_QUANTILES.indexOf(d.value)*20
    })
    .attr("width", 18)
    .attr("height", 18);

legend.append("text")
    .attr("y", function(d){return -2*+d.size-4})
    .attr("dy", "1.3em")
    .text(function(d) {return d.value});

legend.append("text")
    .attr("x", -5)
    .attr("y", - EMS_QUANTILES.length*20)
    .text("GHG emissions value (MtCO2e)");


// data
Promise.all([
  d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"),
  d3.csv("../data/CW_emissions.csv", d => d),
  d3.csv("../data/EMDAT_disasters.csv", d2 => d2)
]).then(function(promises){
  const world = promises[0];
  const emissionsCsv = promises[1];
  const disastersCsv = promises[2];

  // first map with the first year
  var yearData = emissionsDataForYear(emissionsCsv, START_YEAR);
  var prova = disastersDataForYear(disastersCsv, 2000);
  drawMap(world, yearData, prova);

  d3.select("#yearSlider")
    .on("change", function() {
      d3.select("#allYearsCheckbox").property('checked', false);

      var yearInput = +d3.select(this).node().value;
      var yearData = emissionsDataForYear(emissionsCsv, yearInput);
      updateMap(yearData);
    });

  // animation button
  d3.select("#animationButton").on("click", function() {
    console.log("cliccato porcoddio");
    toggleAnimationButton();

    // starting from beginning
    yearData = emissionsDataForYear(emissionsCsv, START_YEAR);
    updateMap(yearData);
    d3.select("#yearText").text(START_YEAR);
    d3.select("#yearSlider").property('value', START_YEAR);
    
    let y = START_YEAR;
    let timer = setInterval(function() {
      if (y > END_YEAR){
        clearInterval(timer);
        toggleAnimationButton();
      }
      else {
        yearData = emissionsDataForYear(emissionsCsv, y);
        updateMap(yearData);
        d3.select("#yearText").text(y);
        d3.select("#yearSlider").property('value', y);
        y += 1;
      }
    }, 100);
  });
});

function toggleAnimationButton() {
  //TODO this method makes the button non-clickable anymore
  let classList = document.getElementById("animationButton").classList;
  classList.toggle(playIconClassName);
  classList.toggle(pauseIconClassName);
}

function drawMap(world, yearData, disastersYearData){
  gMap
  .selectAll("path")
  .data(world.features)
  .join("path")
    // draw each country
    .attr("d", path
      .projection(projection)
    )
    // set the color of each country
    .attr("fill", function (d) {
      d.total = yearData.get(d.id) || 0;
      return colorScale(d.total);
    });

  gMap.selectAll("circle")
  .data(disastersYearData)
  .enter().append("circle")
  .attr("r", 5)
  .attr("cx", function(d) {
    return projection([d.Longitude, d.Latitude])[0];
  })
  .attr("cy", function(d) {
    return projection([d.Longitude, d.Latitude])[1];
  })
  .style("stroke", "#42B7B2")
  //.style("stroke-width", "4px")
  .style("fill", "none");
  
  gMap
    .call(zoom);
    //.call(zoom.transform, d3.zoomIdentity.translate(-500, -250).scale(2));

}

function updateMap(yearData){
  gMap
    .selectAll("path")
      // set the color of each country
      .attr("fill", function (d) {
        d.total = yearData.get(d.id) || 0;
        return colorScale(d.total);
      });
}


/*
FUNCTIONS FOR EMISSIONS CSV
*/
function emissionsDataForYear(emissionsCsv, year){
  var newData = new Map();
  emissionsCsv.forEach(function(d) {
    if (okForEmissionsData(d) && +d.year === year) {
      newData.set(d.country, +d["value (MtCO2e)"]);
    }
  })
  return newData;
}

//TODO DELETE!
function emissionsDataForAllYears(emissionsCsv){
  var newData = new Map();
  emissionsCsv.forEach(function(d) {
    if (okForEmissionsData(d)) {
      var value = +d["value (MtCO2e)"];
      if (d.country in newData){
        value += newData.get(d.country);
      }
      newData.set(d.country, value);
    }
  })
  return newData;
}

function okForEmissionsData(row) {
  return row.gas === "KYOTOGHG" && row.sector === "Total excluding LULUCF" && !(COUNTRY_BIG_CATEGS.includes(row.country));
}

/*
FUNCTIONS FOR DISASTERS CSV
*/
//TODO change names
function disastersDataForYear(disastersCsv, year) {
  var newData = [];
  disastersCsv.forEach(function(d) {
    if (+d.Year === year) {
      newData.push(d)
    }
  })
  return newData;
}