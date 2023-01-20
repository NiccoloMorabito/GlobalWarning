// source (TODO delete) https://d3-graph-gallery.com/graph/bubblemap_template.html
//TODO put the zoom buttons inside the map

const COUNTRY_BIG_CATEGS = ["WORLD", "ANNEXI", "NONANNEXI", "BASIC", "UMBRELLA", "EUU", "LDC", "AOSIS"]
const START_YEAR = 1900; //1850 without disasters
const END_YEAR = 2019;

// max value per year per country: 13000
const EMS_QUANTILES = [0, 50, 250, 1000, 5000, 10000]

const pauseIconClassName = 'fa-circle-pause'
const playIconClassName = 'fa-circle-play'
const countryColorScale = d3.scaleThreshold()
  .domain(EMS_QUANTILES)
  .range(d3.schemeOranges[EMS_QUANTILES.length]);

// stuff
var width = 960,
    height = 650;

var svgMap = d3.select("#map").append("svg")
  .attr("viewBox", [0, 0, width, height]);
const path = d3.geoPath();
const projection = d3.geoMercator()
  .scale(140)
  .center([0,20])
  .translate([width / 2, height / 2 + 80]);
const gMap = svgMap.append("g");

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

// zoom buttons
d3.select("#zoom_in").on("click", function() {
  zoom.scaleBy(svgMap.transition().duration(500), 1.2);
});
d3.select("#zoom_out").on("click", function() {
  zoom.scaleBy(svgMap.transition().duration(500), 0.8);
});

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
var legend = svgMap.append("g")
    .attr("class", "legend")
    .attr("transform", "translate(" + (width - 70) + "," + (height - 20) + ")")
    .selectAll("g")
    .data(legendData)
    .enter().append("g");

// background rect
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
    return countryColorScale(d.value)
    })
    .attr("x", 15)
    .attr("y", function(d, i) {
      return - 2 - EMS_QUANTILES.indexOf(d.value)*20
    })
    .attr("width", 18)
    .attr("height", 18);

legend.append("text")
  .attr("x", -10)
    .attr("y", function(d){return -2*+d.size-4})
    .attr("dy", "1.3em")
  .text(function(d) {return d.value + "+"});

legend.append("text")
    .attr("x", -5)
    .attr("y", - EMS_QUANTILES.length*20)
    .text("GHG emissions value (MtCO2e)");


Promise.all([
  d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"),
  d3.csv("../data/CW_emissions.csv", d => d),
  d3.csv("../data/EMDAT_disasters.csv", d2 => d2)
]).then(function(promises){
  const world = promises[0];
  const emissionsCsv = promises[1];
  const disastersCsv = promises[2];

  // first map with the first year
  var emissionsYearData = getEmissionsDataForYear(emissionsCsv, START_YEAR);
  var disastersYearData = getDisastersDataForYear(disastersCsv, START_YEAR);
  drawMap(world, emissionsYearData, disastersYearData);

  // year selection
  d3.select("#yearSlider")
    .on("change", function() {
      d3.select("#allYearsCheckbox").property('checked', false);

      var yearInput = +d3.select(this).node().value;
      emissionsYearData = getEmissionsDataForYear(emissionsCsv, yearInput);
      disastersYearData = getDisastersDataForYear(disastersCsv, yearInput);
      updateMap(emissionsYearData, disastersYearData);
    });

  // animation button
  d3.select("#animationButton").on("click", function() {
    toggleAnimationButton();
    
    var y = START_YEAR;
    var timer = setInterval(function() {
      if (y > END_YEAR){
        clearInterval(timer);
        toggleAnimationButton();
      }
      else {
        emissionsYearData = getEmissionsDataForYear(emissionsCsv, y);
        disastersYearData = getDisastersDataForYear(disastersCsv, y);
        updateMap(emissionsYearData, disastersYearData);
        d3.select("#yearText").text(y);
        d3.select("#yearSlider").property('value', y);
        y += 1;
      }
    }, 250);
  });
});

function toggleAnimationButton() {
  //TODO this method makes the button non-clickable anymore
  let button = document.getElementById("animationButton");
  button.classList.toggle(playIconClassName);
  button.classList.toggle(pauseIconClassName);
}

function drawMap(world, emissionsYearData, disastersYearData){
  // color countries
  gMap.selectAll("path")
    .data(world.features)
    .join("path")
      // draw each country
      .attr("d", path
        .projection(projection)
      )
      // set the color of each country
      .attr("fill", function (d) {
        d.total = emissionsYearData.get(d.id) || 0;
        return countryColorScale(d.total);
      });

  // plot circles for disasters
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
  
  gMap.call(zoom);
}

function updateMap(emissionsYearData, disastersYearData){
  // color countries
  gMap.selectAll("path")
      // set the color of each country
      .attr("fill", function (d) {
        d.total = emissionsYearData.get(d.id) || 0;
        return countryColorScale(d.total);
      });

  // plot circles for disasters
  gMap.selectAll("circle")
    .remove();

  gMap
    .selectAll("circle")
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
}


/*
FUNCTIONS FOR EMISSIONS CSV
*/
function getEmissionsDataForYear(emissionsCsv, year){
  var newData = new Map();
  emissionsCsv.forEach(function(d) {
    if (okForEmissionsData(d) && +d.year === year) {
      newData.set(d.country, +d["value (MtCO2e)"]);
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
function getDisastersDataForYear(disastersCsv, year) {
  var newData = [];
  disastersCsv.forEach(function(d) {
    if (+d.Year === year) {
      newData.push(d)
    }
  })
  return newData;
}