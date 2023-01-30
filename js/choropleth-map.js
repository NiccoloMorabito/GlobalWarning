// source (TODO delete) https://d3-graph-gallery.com/graph/bubblemap_template.html
//TODO put the zoom buttons inside the map
//TODO put the legend(s) outside the map
//TODO hovering over a country, some information could come out

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
    
  });
gMap.call(zoom);

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


// LEGEND FOR COLORS
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

legendContryColor.append("rect")
  .style("fill", function(d, i) {
    return countryColorScale(d.value)
  })
  .attr("x", 15)
  .attr("y", function(d, i) {
    return - 2 - i*20
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
  .text("GHG emissions value (MtCO2e)")
  .attr("font-weight", 700); //TODO not working



Promise.all([
  d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"),
  d3.csv("data/CW_emissions.csv", d => d),
  d3.csv("data/EMDAT_disasters_reduced.csv", d2 => d2)
]).then(function(promises){
  const world = promises[0];
  const emissionsCsv = promises[1];
  const disastersCsv = promises[2];

  // first map with the first year
  var emissionsYearData = getEmissionsDataForYear(emissionsCsv, START_YEAR);
  var disastersYearData = getDisastersDataForYear(disastersCsv, START_YEAR);
  drawAndUpdateMap(world, emissionsYearData, disastersYearData);

  // year selection
  d3.select("#yearSlider")
    .on("change", function() {
      d3.select("#allYearsCheckbox").property('checked', false);

      var yearInput = +d3.select(this).node().value;
      emissionsYearData = getEmissionsDataForYear(emissionsCsv, yearInput);
      disastersYearData = getDisastersDataForYear(disastersCsv, yearInput);
      drawAndUpdateMap(world, emissionsYearData, disastersYearData);
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
        drawAndUpdateMap(world, emissionsYearData, disastersYearData, transitionForDisasters=false);
        d3.select("#yearText").text(y);
        d3.select("#yearSlider").property('value', y);
        y += 1;
      }
    }, 250);
  });
});

function toggleAnimationButton() {
  //TODO the toggle function below makes the button non-clickable anymore
  let button = document.getElementById("animationButton");
  button.classList.toggle(playIconClassName);
  button.classList.toggle(pauseIconClassName);
}

function drawAndUpdateMap(world, emissionsYearData, disastersYearData, transitionForDisasters = true) {
  const colorTransition = d3.transition()
    .ease(d3.easeCubic)
    .duration(400);
  
  if (transitionForDisasters) disasterTransitionDuration = 400;
  else disasterTransitionDuration = 0;
  const disastersTransition = d3.transition()
    .ease(d3.easeLinear)
    .duration(disasterTransitionDuration);
    
  // colors of countries
  gMap.selectAll("path.countriesColor")
    .data(world.features)
    .join(
      enter => enter.append("path")
        .attr("class", "countriesColor")
        // draw each country
        .attr("d", path.projection(projection))
        // set the color of each country
        .attr("fill", function (d) {
          d.total = emissionsYearData.get(d.id) || 0;
          return countryColorScale(d.total);
        })
        .call(enter => enter.transition(colorTransition)),
      update => update.transition(colorTransition)
        .attr("fill", function (d) {
          d.total = emissionsYearData.get(d.id) || 0;
          return countryColorScale(d.total);
        }),
    );
  
  // scatter-plot icons for disasters
  gMap.selectAll("image.disaster")
  .data(disastersYearData)
  .join(
    enter => enter.append("image")
      .attr("id", d => `${d['Disaster Type'].replace(" ", "")}-mapIcons`)
      .attr("class", "disaster")
      .attr("xlink:href", d => `icons/${d['Disaster Type']}.png`)
      .attr("width", "10px")
      .attr("height", "10px")
      .attr("x", function(d){ return projection([+d.Longitude, +d.Latitude])[0]})
      .attr("y", function(d){ return projection([+d.Longitude, +d.Latitude])[1]})

      .call(enter => enter.transition(disastersTransition)),
    update => update.transition(disastersTransition)
      .attr("id", d => `${d['Disaster Type'].replace(" ", "")}-mapIcons`)
      .attr("xlink:href", d => `icons/${d['Disaster Type']}.png`)
      .attr("x", function(d){ return projection([+d.Longitude, +d.Latitude])[0]})
      .attr("y", function(d){ return projection([+d.Longitude, +d.Latitude])[1]}),
    exit => exit.transition(disastersTransition)
      .remove(),
  );

  //TODO still problem on the disasters when changing year and the map is zoomed
  gMap.call(zoom.transform, d3.zoomIdentity); // temp. solution (zooming out everytime the map is updated)

  // plot legend
  disastersTypes = new Set(disastersYearData.map(d => d['Disaster Type']));
  drawLegendDisasters(disastersTypes);
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


// LEGEND FOR DISASTERS
function drawLegendDisasters(disastersTypes) {
  const transition = d3.transition().duration(100);

  disastersTypes = Array.from(disastersTypes).sort();

  // icons
  svgMap
    .selectAll("image.legendDisastersIcons")
    //.each(d => console.log(d))
    .data(disastersTypes, dt => dt)
    .join(
      enter => enter.append("image")
        .attr("id", d => `${d.replace(" ", "")}-legendIcon`)
        .attr("class", "legendDisastersIcons")
        .attr("xlink:href", d => `icons/${d}.png`)
        .attr("x", 0)
        .attr("y", function(d, i) {return - 2 - i*30})
        .attr("width", 18)
        .attr("height", 18)
        .on("mouseover", mouseoverDisaster)
        .on("mouseout", mouseoutDisaster)
        .call(enter => enter.transition(transition)),
      update => update.transition(transition)
        .attr("y", function(d, i) {return - 2 - i*30}),
      exit => exit.transition(transition).remove(),
    )
    .attr("transform", "translate(70," + (height - 20) + ")");
  
  // text
  svgMap
    .selectAll("text.legendDisastersTexts")
    .data(disastersTypes, dt => dt)
    .join(
      enter => enter.append("text")
        .attr("id", d => `${d.replace(" ", "")}-legendText`)
        .attr("class", "legendDisastersTexts")
        .attr("x", 30)
        .attr("y", function(d, i){return -7 - i*30})
        .attr("dy", "1.3em")
        .attr("width", 18)
        .attr("height", 18)
        .text(function(d) {return d})
        .on("mouseover", mouseoverDisaster)
        .on("mouseout", mouseoutDisaster)
        .call(enter => enter.transition(transition)),
      update => update.transition(transition)
        .attr("y", function(d, i){return -7 - i*30}),
      exit => exit.transition(transition).remove(),
    )
    .attr("transform", "translate(70," + (height - 20) + ")");
  
  // title
  svgMap
    .selectAll("text.legendDisastersTitle")
    .data([1])
    .join(
      enter => enter.append("text")
        .attr("class", "legendDisastersTitle")
        .attr("font-weight", 700)
        .attr("x", 0)
        .attr("y", - disastersTypes.length * 30)
        .text("Natural disasters")
        .call(enter => enter.transition(transition)),
      update => update.transition(transition)
        .attr("y", - disastersTypes.length * 30),
      exit => exit.transition(transition).remove(),
    )
    .attr("transform", "translate(70," + (height - 20) + ")");
    
}

function mouseoverDisaster() {
  // make the other disasters in the legend more transparent
  svgMap
    .selectAll("text.legendDisastersTexts,image.legendDisastersIcons")
    .style("opacity", 0.1);
  
  // hide from the map all the icons of the non-selected disasters
  svgMap.selectAll("image.disaster")
    .style("opacity", 0);

  // highlight the selected disaster's text/icon + icons on the map
  id = this.id.split("-")[0];
  svgMap.selectAll(`#${id}-legendText, #${id}-legendIcon, #${id}-mapIcons`)
    .style("opacity", 1)
    .attr("font-weight", 1000);
  
}

function mouseoutDisaster() {
  // make all the disasters normal again
  svgMap.selectAll("text.legendDisastersTexts,image.legendDisastersIcons")
    .style("opacity", 1)
    .attr("font-weight", 300);

  // show all the disasters icons again
  svgMap.selectAll("image.disaster")
    .style("opacity", 1);
}