var width = 1000,
	height = 500;

var proj = d3.geo.mercator()
		.center([0, 0])
		.scale(180)
		.rotate([-10,-10]);

var path = d3.geo.path()
		.projection(proj);

var zoom = d3.behavior.zoom()
    .translate(proj.translate())
    .scale(proj.scale())
    .scaleExtent([height*.33, 40 * height])
    .on("zoom", zoom);


var svg = d3.select("#map").append("svg")
		.attr("width", width)
		.attr("height", height)
		.call(zoom);

function zoom() {
	proj.translate(d3.event.translate).scale(d3.event.scale);
	svg.selectAll("path").attr("d", path);
	circles
  		.attr("cx", function(d){return proj([d.longitude, d.latitude])[0];})
		.attr("cy", function(d){return proj([d.longitude, d.latitude])[1];});
}

var borders = svg.append("g");

var impacts = svg.append("g");

var locationScale = d3.scale.pow().exponent(.5).domain([0, 1000, 10000, 50000, 130000]);


var colorScale = d3.scale.linear().domain([0, 0.001, 0.01, 0.1, 0.2]);
colorScale
    .range(["#3075FF", "#075AFF", "#004FF1", "#0149DC", "#0043C8"]);
var request_countcale = d3.scale.linear().domain([0, 50, 100, 1000, 20000, 400000]);

var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 1e-6)
    .style("background", "rgba(250,250,250,.7)");


queue()
	.defer(d3.json, "worldTopo.json")
	.defer(d3.csv, "Data-TVGeoAnalytics.csv")
	.defer(d3.json, "pics.json")
	.await(ready);

var locations;
function ready(error, topology, rawlocations, pics){
    
    console.debug("rawlocations")
    console.debug(rawlocations)

    console.debug("topology")
    console.debug(topology)
    
	borders.selectAll("path")
		.data(topojson.object(topology, topology.objects.countries)
				.geometries)
	.enter()
		.append("path")
		.attr("d", path)
		.attr("class", "border")
    
    /*
	
    if(typeof location_data !== 'undefined'){
	    rawlocations = location_data;
    }
    else{
        rawlocations = location_dataBU;
    }
    */
    
	locations = [];
    
    idcount = 10000;

    
	rawlocations.forEach(function(d){
        if(isNaN(d.error_count)){
          //  console.debug("in else with "+d.errorCount)
            d.errorCount = 1;
        }
        else {
            d.errorCount = 1;//+d.error_count;
        }
        d.requestCount = d.user_count;//+d.request_count;
      //  d.errorCount = +d.error_count; 
		d.mass = +d.user_count;
        //console.debug( "returning: " + ((new Date(d.timestamp).getDate()-14)*24) + new Date(d.timestamp).getHours()  );
	 	d.timestamp = d.timestamp*2;//+(  ((new Date(d.timestamp).getDate()-14)*24) + new Date(d.timestamp).getHours()  );
        
		d.id = idcount;
        idcount--;
	        if (d.user_count > 0)
			locations.push(d);
	
	});
    
    console.debug("location: ")
	locations.sort(function(a, b){return a.id - b.id;})

	locationScale
		.range([1, 4, 8, 10, 12]);

    console.debug(locations);



	circles = impacts.selectAll("circle")
		.data(locations).enter()
			.append("svg:a")
		    	.attr("xlink:href", function(d) { return ""; })
		    	.attr("xlink:show", "new")
			.append("circle")
				.attr("cx", function(d){return proj([d.longitude, d.latitude])[0];})
				.attr("cy", function(d){return proj([d.longitude, d.latitude])[1];})
				.attr("r", 	function(d){return locationScale(d.mass);})
				.attr("id", function(d){return "id" + d.id;})
				.style("fill", function(d){/*console.debug("d.requestCount/d.errorCount", d.errorCount,d.requestCount, d.errorCount/d.requestCount); */ return colorScale(d.errorCount/d.requestCount);	})
		.on("mouseover", function(d){
			d3.select(this)
				.attr("stroke", "black")
				.attr("stroke-width", 1)
                .style("fill", "#FFC20E")
				.attr("fill-opacity", 1);

			tooltip
			    .style("left", (d3.event.pageX + 5) + "px")
			    .style("top", (d3.event.pageY - 5) + "px")
			    .transition().duration(300)
			    .style("opacity", 1)
			    .style("display", "block")

			updateDetails(d);
			})
		.on("mouseout", function(d){
			d3.select(this)
				.attr("stroke", "")
                .style("fill", function(d){/*console.debug("d.requestCount/d.errorCount", d.errorCount,d.requestCount, d.errorCount/d.requestCount); */ return colorScale(d.errorCount/d.requestCount);	})
				.attr("fill-opacity", function(d){return 1;})

			tooltip.transition().duration(700).style("opacity", 0);
		});

	lb = 1.370;
	locationsCF = crossfilter(locations),
		all = locationsCF.groupAll(),
		timestamp = locationsCF.dimension(function(d){ return d.timestamp;}),
		timestamps = timestamp.group(function(d){return d;}),
        errorC = locationsCF.dimension(function(d){return d.errorCount}),
        errorsC = errorC.group(function(d){
            var rv = Math.pow(lb, Math.floor(Math.log(d)/Math.log(lb)))
            return rv;}),
		mass = locationsCF.dimension(function(d){return d.mass}),
		masses = mass.group(function(d){ 
			var rv = Math.pow(lb, Math.floor(Math.log(d)/Math.log(lb)))
			return rv;}),
		type = locationsCF.dimension(function(d){return "D e";}),
		types = type.group();

		cartoDbId = locationsCF.dimension(function(d){return d.id;});
		cartoDbIds = cartoDbId.group()
    console.debug("tt");
    console.debug(timestamp);
    console.debug(timestamps);
	var charts = [
		barChart()
				.dimension(timestamp)
				.group(timestamps)
			.x(d3.scale.linear()
				.domain([0,48])
				.rangeRound([0, 20*24-5])),

		barChart()
				.dimension(mass)
				.group(masses)
                .x(d3.scale.pow().exponent(0.1)  //.x(d3.scale.log().base([lb])
				.domain([1,130000])
				.rangeRound([0,20*24]))

	];

	var chart = d3.selectAll(".chart")
			.data(charts)
			.each(function(chart){chart.on("brush", renderAll).on("brushend", renderAll)});

	d3.selectAll("#total")
			.text(locationsCF.size());


	function render(method){
		d3.select(this).call(method);
	}


	lastFilterArray = [];
	locations.forEach(function(d, i){
		lastFilterArray[i] = 1;
	});

	function renderAll(){
		chart.each(render);

		var filterArray = cartoDbIds.all();
		filterArray.forEach(function(d, i){
			if (d.value != lastFilterArray[i]){
				lastFilterArray[i] = d.value;
				d3.select("#id" + d.key).transition().duration(500)
						.attr("r", d.value == 1 ? 2*locationScale(locations[i].mass) : 0)
					.transition().delay(0).duration(0)
						.attr("r", d.value == 1 ? locationScale(locations[i].mass) : 0);

			}
		})

		d3.select("#active").text(all.value());
	}

	window.reset = function(i){
		charts[i].filter(null);
		renderAll();
	}

	renderAll();
}


var printDetails = [
                    {'var': 'timestamp', 'print': 'Hour of day (24h)'},
					{'var': 'user_count', 'print': 'Active televisions'}
                    ];

function updateDetails(location){
	var image = new Image();

	tooltip.selectAll("div").remove();
	tooltip.selectAll("div").data(printDetails).enter()
		.append("div")
			.append('span')
				.text(function(d){return d.print + ": ";})				
				.attr("class", "boldDetail")
			.insert('span')
				.text(function(d){if (d.var == "timestamp") return (location[d.var]/2); console.debug(location[d.var]); return location[d.var];})
				.attr("class", "normalDetail");
}
