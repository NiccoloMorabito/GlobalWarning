// source (TODO delete) https://d3-graph-gallery.com/graph/bubblemap_template.html
//TODO put the zoom buttons inside the map
//TODO put the legend(s) outside the map

const COUNTRY_BIG_CATEGS = ["WORLD", "ANNEXI", "NONANNEXI", "BASIC", "UMBRELLA", "EUU", "LDC", "AOSIS"]
const EXCLUDED_DIS_TYPES = ["Fog", "Insect infestation"]
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

//var currentZoomScale = 1;
const zoom = d3.zoom()
  .scaleExtent([1, 8])
  .translateExtent([[0, 0], [width, height]])
  .on('zoom', function zoomed(event) {
    //console.log(d3.zoomTransform(this).k);
    //currentZoomScale = event.transform.k;

    // zoom color countries
    gMap.selectAll('path.countriesColor')
      .attr('transform', event.transform);

    //zoom disaster
    gMap.selectAll('image.disaster')
      //.each(function(d, i) { console.log(+d.Longitude, +d.Latitude); });
      .attr("transform", event.transform);
    
/*
source for this https://stackoverflow.com/questions/34323318/d3-us-state-map-with-markers-zooming-transform-issues
    gMap.selectAll('image.disaster')
      .attr('transform', function(){
        translate = d3.select(this).attr("transform");
        translate0 = parseFloat(translate.split("(")[1].split(",")[0]);
        //translate0 -= event.transform.x / event.transform.k;
        translate1 = parseFloat(translate.split(",")[1].trim(")"));
        //translate1 -= event.transform.y / event.transform.k;
        //return "translate(" + translate0 + ", 0) scale(" + event.transform.k + ")";
        return "translate(" + translate0 +","+ translate1 + ")scale("+1/event.transform.k+")";
      });
    //  `translate(${projection([+d.Longitude, +d.Latitude])[0]}, ${projection([+d.Longitude, +d.Latitude])[1]})`
    */
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
var quantilesForLegend = [];
EMS_QUANTILES.forEach(q => {
  quantilesForLegend.push({"size": EMS_QUANTILES.indexOf(q)*10, "value": q})
});
var legendContryColor = svgMap.append("g")
    .attr("class", "legend")
    .attr("transform", "translate(" + (width - 70) + "," + (height - 20) + ")")
    .selectAll("g")
    .data(quantilesForLegend)
    .enter().append("g");

// background rect
legendContryColor.append('rect')
  .attr('x', -80)
  .attr('y', -140)
  .attr('width', 400) //TODO change these values, they go outside of the borders
  .attr('height', 400)
  .attr('stroke', 'grey')
  .attr('stroke-opacity', 0.1)
  .attr('fill', 'grey')
  .attr('fill-opacity', 0.1);

legendContryColor.append("rect")
  .style("fill", function(d, i) {
    return countryColorScale(d.value)
  })
  .attr("x", 15)
  .attr("y", function(d, i) {
    return - 2 - EMS_QUANTILES.indexOf(d.value)*20
  })
  .attr("width", 18)
  .attr("height", 18);

legendContryColor.append("text")
  .attr("x", -10)
  .attr("y", function(d){return -2*+d.size-4})
  .attr("dy", "1.3em")
  .text(function(d) {return d.value + "+"});

legendContryColor.append("text")
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
  /*
  disasterColors = d3.scaleOrdinal()
    .domain(disastersCsv.map(d => d["Disaster Type"])) some of the types are then excluded
    .range(d3.schemeTableau10);
  disasterShapes = d3.scaleOrdinal(
    disastersCsv.map(d => d["Disaster Type"]),
    d3.symbols.map(s => d3.symbol().type(s)())
  )
  //TODO there are 7 symbols and 10 disaster types
  console.log(d3.symbols);
  console.log(new Set(disastersCsv.map(d => d["Disaster Type"])));
  */
  

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
  //button.disabled = true
}

function drawMap(world, emissionsYearData, disastersYearData){
  // color countries
  gMap.selectAll("path")
    .data(world.features)
    .join("path")
    .attr("class", "countriesColor")
      // draw each country
      .attr("d", path.projection(projection))
      // set the color of each country
      .attr("fill", function (d) {
        d.total = emissionsYearData.get(d.id) || 0;
        return countryColorScale(d.total);
      });

  // plot icons for disasters
  gMap.selectAll("circles")
    .data(disastersYearData) //.sort((a,b) => +b.n - +a.n).filter((d,i) => i<1000))
    .enter().append("image")
    .attr("class", "disaster")
    //.attr("d", d => disasterShapes(d["Disaster Type"]))
    .attr("xlink:href", 'icons/drought.png')
    .attr("width", "10px")
    .attr("height", "10px")
    //.attr("transform",
    //  d => `translate(${projection([+d.Longitude, +d.Latitude])})`
    //)
    .attr("x", function(d){ return projection([+d.Longitude, +d.Latitude])[0]})
    .attr("y", function(d){ return projection([+d.Longitude, +d.Latitude])[1]})
    //.attr("fill", d => disasterColors(d["Disaster Type"]));
  
  gMap.call(zoom);
}

function updateMap(emissionsYearData, disastersYearData){
  // color countries
  gMap.selectAll("path.countriesColor")
    .attr("fill", function (d) {
      d.total = emissionsYearData.get(d.id) || 0;
      return countryColorScale(d.total);
    });

  // remove previous disasters
  gMap.selectAll("image.disaster")
    .remove();

  // plot shapes for disasters
  gMap.selectAll("circles")
    .data(disastersYearData)
    .enter().append("image")
    .attr("class", "disaster")
    //.attr("d", d => disasterShapes(d["Disaster Type"]))
    .attr("xlink:href", d => `icons/${d['Disaster Type']}.png`)
    .attr("width", "10px")
    .attr("height", "10px")
    //.attr("transform",
    //  d => `translate(${projection([+d.Longitude, +d.Latitude])})`
    //)
    .attr("x", function(d){ return projection([+d.Longitude, +d.Latitude])[0]})
    .attr("y", function(d){ return projection([+d.Longitude, +d.Latitude])[1]})
    //.attr("fill", "blue"); //d => disasterColors(d["Disaster Type"])) //TODO decide whether to keep only colour

  //TODO still problem on the disasters when changing year and the map is zoomed
  gMap.call(zoom.transform, d3.zoomIdentity); // temp. solution (zooming out everytime the map is updated)
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
    if (+d.Year === year && !(EXCLUDED_DIS_TYPES.includes(d["Disaster Type"]))) {
      newData.push(d)
    }
  })
  return newData;
}