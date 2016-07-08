//closure containing interactive logic
(function(){

	//container for local variables
	var scope = {};

	//directory containing data
	scope.repo = "./data/"; 
	//scope.repo = "directory/on/wordpress";

	//reference to data for chart/map
	var data = {};
	data.loaded = false;
	data.allRows = [];
	data.cut = [];
	data.cat = "emp";
	data.var = "gr1315";
	data.vars = ["num15", "sh15", "gr1013", "gr1315"];
	data.ranges = {emp:{}, gdp:{}};
	data.metro = null;
	data.selection = null;

	//container for dom references and metadata
	var dom = {svgsupport:true};
	dom.wrap = d3.select("#ai2016wrap");
	
	dom.chart = {};
	dom.chart.wrap = d3.select("#ai2016chart");
	dom.chart.svg = dom.chart.wrap.append("svg");
	dom.chart.xaxis = dom.chart.svg.append("g").classed("axis-group",true).attr("transform","translate(0,40)");
	dom.chart.yaxis = dom.chart.svg.append("g").classed("axis-group",true).attr("transform","translate(55,0)");

	dom.map = {};
	dom.map.wrap = d3.select("#ai2016map");

	dom.dp = {};
	dom.dp.wrap = d3.select("#ai2016at-a-glance");
	dom.dp.indicators = d3.select("#ai2016indicator-bar").append("div");

	dom.select = {};
	dom.select.cat = d3.select("#ai2016catselect").append("select");
	dom.select.metro = d3.select("#ai2016select").append("select");
	 

	//check support for svg
	if(!document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1")){
		document.getElementById("ai2106wrap").innerHTML = '<p style="font-style:italic;text-align:center;margin:30px 0px 30px 0px;">This interactive feature requires a modern browser such as Chrome, Firefox, IE9+, or Safari.</p>';
		dom.svgsupport = false;
		return null;
	}

	//generate number formatting functions
	scope.format = (function(){
		var d3num = d3.format(",.0f");
		var d3share = d3.format(",.1%");
		var d3pctchg = d3.format("+,.1%");
		var o = {};

		//decorate the standard d3 formatting functions because they don't handle null values well
		o.num = function(v){return v===null ? "NA" : d3num(v)};
		o.share = function(v){return v===null ? "NA" : d3share(v)};
		o.pctchg = function(v){return v===null ? "NA" : d3pctchg(v)};
		return o;
	})();
	scope.varfmt = {
		num15:scope.format.num,
		sh15:scope.format.share,
		gr1013:scope.format.pctchg,
		gr1315:scope.format.pctchg
	};


	//coerce string to number
	function coerce2num(v){
		var n = +(v+"");
		return (v===null || v==="NA" || isNaN(n)) ? null : n;
	}

	//parser for data file import
	function parser(d){
		var row = {};
		row.raw = d;
		row.metro = d.FIP;
		row.metname = d.MetroName;
		
		//industry data
		row.ind = [];
		for(var i=1; i<=5; i++){
			row.ind.push({
				name:d["Title"+i],
				emp:coerce2num(d["INDEMP"+i]*1000),
				sh:coerce2num(d["INDAISHARE"+i]),
				gr1315:coerce2num(d["IND_GR20132015_EMP"+i])
			})	
		}
		row.emp = {};
		row.emp.num10 = coerce2num(d.AIEMP2010);
		row.emp.num13 = coerce2num(d.AIEMP2013);
		row.emp.num15 = coerce2num(d.AIEMP2015);
		row.emp.sh15 = coerce2num(d.AIEMPSHARE2015);
		row.emp.gr1013 = coerce2num(d.AIEMP_GR_2010_2013);
		row.emp.gr1015 = coerce2num(d.AIEMP_GR_2010_2015);
		row.emp.gr1315 = coerce2num(d.AIEMP_GR_2013_2015);

		row.gdp = {};
		row.gdp.num10 = coerce2num(d.AIGDP2010);
		row.gdp.num13 = coerce2num(d.AIGDP2013);
		row.gdp.num15 = coerce2num(d.AIGDP2015);
		row.gdp.sh15 = coerce2num(d.AIGDPSHARE2015);
		row.gdp.gr1013 = coerce2num(d.AIGDP_GR_2010_2013);
		row.gdp.gr1015 = coerce2num(d.AIGDP_GR_2010_2015);
		row.gdp.gr1315 = coerce2num(d.AIGDP_GR_2013_2015);		


		return row;
	}

	d3.csv(scope.repo+"AIData.csv", parser, function(dat){
		if(dat===null){
			return null; //no-op if there's an error retrieving data
		}
		data.loaded = true;

		data.cut = data.allRows = dat.filter(function(d,i,a){return d.raw.TOP100==="1"});

		data.lookup = {};
		for(var i=0; i<dat.length; i++){
			data.lookup[dat[i].metro] = dat[i];
		}

		optData = data.cut.map(function(d,i){
			return {val: d.metro, label: d.metname}
		});
		optData.sort(function(a,b){return a.label < b.label ? -1 : 1});
		
		data.metro = optData[0].val;

		for(var v=0; v<data.vars.length; v++){
			data.ranges.emp[data.vars[v]] = d3.extent(data.cut, function(d,i){return d.emp[data.vars[v]]});
			data.ranges.gdp[data.vars[v]] = d3.extent(data.cut, function(d,i){return d.gdp[data.vars[v]]});
		}
		data.ranges.emp.growth = d3.extent(data.ranges.emp.gr1013.concat(data.ranges.emp.gr1315));
		data.ranges.gdp.growth = d3.extent(data.ranges.gdp.gr1013.concat(data.ranges.gdp.gr1315));

		var options = dom.select.metro.selectAll("option").data(optData)
		options.enter().append("option");
		options.exit().remove();
		options.attr("value",function(d,i){return d.val}).text(function(d,i){return d.label});

		var catoptions = dom.select.cat.selectAll("option").data([{val:"emp", label:"Jobs"}, {val:"gdp", label:"GDP"}]);
		catoptions.enter().append("option");
		catoptions.exit().remove();
		catoptions.attr("value",function(d,i){return d.val}).text(function(d,i){return d.label});

		drawChart();
		drawDataPoints();

		dom.select.metro.on("change",function(d,i){
			console.log("change");
			if(this.value===data.metro){return null}
			setMetro(this.value);
		})

		dom.select.cat.on("change",function(d,i){
			data.cat = this.value;
			drawChart();
			drawDataPoints();
		});
	});

	//calculate the rank of data in the array data_array. accessor specifies how to extract the data value from each data element
	function calcRank(data, data_array, accessor){

		var d = accessor(data);
		var reference = data_array.map(accessor);
		reference.sort(function(a,b){return a-b});

		try{
			var i = reference.indexOf(d) + 1;
			var rank = (i>0 && d!==null) ? i : "N/A";
		}
		catch(e){
			if(!Array.prototype.indexOf){
				var rank = "N/A";
			}
			else{
				var rank = "N/A";
			}
		}
		finally{
			return rank;
		}
	}
	
	var xaxis = d3.svg.axis().orient("top").ticks(5);
	var yaxis = d3.svg.axis().orient("left").ticks(5);

	function titleText(v){
		if(v==="num15"){var title = "Advanced industries " + (data.cat === "emp" ? "jobs" : "output") + ", 2015";}
		else if(v==="sh15"){var title = "Advanced industries' share of " + (data.cat === "emp" ? "all jobs" : "total output") + ", 2015";}
		else if(v==="gr1013"){var title = "Annual average percent change in advanced industries " + (data.cat === "emp" ? "jobs" : "output") + ", 2010–2013"}
		else if(v==="gr1315"){var title = "Annual average percent change in advanced industries " + (data.cat === "emp" ? "jobs" : "output") + ", 2013–2015"}					
		return title;
	}

	//function to: 1) create/update chart (if data passed) and 2) create/update chart layout
	function drawChart(resize){

		//determine layout
		try{
			var bbox = dom.wrap.node().getBoundingClientRect();
			var width = bbox.right - bbox.left;		
		}
		catch(e){
			var width = 780;
		}

		try{
			if(!data.loaded || !data.cut){throw "dataNotLoaded"}

			//data accessor, depending on the user selection of cut and var
			var accessor = function(d){return d[data.cat][data.var];}

			if(!data.selection){
				data.selection = dom.chart.svg.selectAll("g.bar").data(data.cut, function(d,i){return d.metro});
				var E = data.selection.enter().append("g").classed("bar", true).style("pointer-events","all");
				E.append("rect");
				E.append("line");
				E.append("circle").attr({"r":"4", "cx":"0", "cy":"0"});
				E.append("text");
				data.selection.exit().remove();		
				data.selection.sort(function(a,b){
					return accessor(a) - accessor(b);
				});		
			}

			//for easier reference
			var sel = data.selection; 
			var cut = data.cut;

			//record current order in the dom
			sel.each(function(d,i){
				d3.select(this).attr("data-order", i);
			})

			//set new order
			sel.sort(function(a,b){return accessor(a)-accessor(b)});

			if(arguments.length===1){
				var duration = 1000;
				var delay = 0;
			}
			else{
				var duration = function(d,i){
					var o = +(d3.select(this).attr("data-order"));
					var dur = 600 + Math.abs(i-o)*30;
					return dur;					
				}
				var delay = function(d,i){
					var o = +(d3.select(this).attr("data-order"));
					var del = 0*20;
					return del;					
				}
			}

			if(data.var in {gr1013:1, gr1315:1}){
				var range = data.ranges[data.cat].growth;
			}
			else{
				var range = data.ranges[data.cat][data.var];
			}
			if(range[0] > 0){range[0] = 0}

			var scale = d3.scale.linear().domain([range[0]*1.05, range[1]*1.05]).range([0, width]);

			var lines = sel.select("line");
			var rects = sel.select("rect").attr({"fill":"none", "stroke":"none"});

			//responsive layout -- column chart for wide viewport, bar chart for narrow viewport
			if(width < 780){
				var height = (10*cut.length)+75;
				scale.range([25, width-25]);
				sel.transition()
				.duration(1000)
				.delay(0)
				.attr("transform", function(d,i){
					var cx = scale(accessor(d));
					return "translate("+cx+","+((i*10)+50)+")";
				});

				lines
				.style("shape-rendering","crispEdges")
				.attr("stroke",function(d,i){
					var D = accessor(d);
					return D < 0 ? "#dc2a2a" : "#0d73d6";
				})
				.transition()
				.duration(1200)
				.delay(0)
				.attr({y1:0, y2:0, x1:0})
				.attr("x2", function(d,i){
					var x = scale(accessor(d));
					var o = scale(0);
					return 0-x+o; 
				})
				.each("end",function(){d3.select(this).style("shape-rendering","crispEdges")});

				dom.chart.svg.style({"width":"100%", "height":height+"px"});
				xaxis.scale(scale).tickFormat(scope.varfmt[data.var]);
				dom.chart.xaxis.style("display","inline").transition().duration(1000).call(xaxis);
				dom.chart.yaxis.style("display","none");

				rects.attr({"width":width-50, "height":"10px", "y":"-5"})
					 .attr("x",function(d,i){
					 	var x = scale(accessor(d));
					 	return 25-x;
					 });
			}
			else{
				var height = 450;
				scale.range([445, 5]);
				var xstep = (width-100)/cut.length;
				sel.transition()
				.duration(duration)
				.delay(delay)
				.attr("transform", function(d,i){
					var cy = scale(accessor(d));
					return "translate("+((i*xstep)+75)+","+cy+")";
				});

				lines
				.style("shape-rendering","crispEdges")
				.attr("stroke",function(d,i){
					var D = accessor(d);
					return D < 0 ? "#dc2a2a" : "#0d73d6";
				})
				.transition().duration(100).delay(delay)
				.attr({x1:0, x2:0, y1:0, y2:0})
				.transition()
				.duration(duration)
				.attr({x1:0, x2:0, y1:0})
				.attr("y2", function(d,i){
					var y = scale(accessor(d));
					var o = scale(0);
					return 0-y+o; 
				})
				.each("end",function(){d3.select(this).style("shape-rendering","crispEdges")});


				dom.chart.svg.style({"width":"100%", "height":height+"px"});
				yaxis.scale(scale).tickFormat(scope.varfmt[data.var]);
				dom.chart.yaxis.style("display","inline").transition().duration(1000).call(yaxis);
				dom.chart.xaxis.style("display","none");

				rects.attr({"width":xstep, "height":"440", "x":0-(xstep/2)})
					 .attr("y",function(d,i){
					 	var y = scale(accessor(d));
					 	return 5 - y;
					 });
			}

			sel.select("circle").attr("fill",function(d,i){
				var D = accessor(d);
				return D < 0 ? "#dc2a2a" : "#0d73d6";
			})

			sel.on("mouseenter",function(d,i){
				drawDataPoints(d.metro);
				d3.select(this).select("rect").attr("fill","#e0e0e0");
			});
			sel.on("mouseleave",function(d,i){
				drawDataPoints();
				rects.attr("fill","none");
			})
			sel.on("mousedown",function(d,i){
				setMetro(d.metro);
			});

			d3.select("p#ai2016chart-title").text(titleText(data.var));
		}
		catch(e){
			console.log(e);
			dom.chart.svg.selectAll("g").remove();
		}

	}

	//resize layout/chart
	var resizeTimer;
	var resizeFn = function(){
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(function(){
			drawChart("resize"); //update layout on resize
		}, 250);		
	}
	window.addEventListener("resize", resizeFn);

	function drawDataPoints(metCode){
		if(arguments.length===1){
			var met = metCode;
		}
		else{
			var met = data.metro;
		}

		try{
			if(!data.loaded || !data.cut){throw "dataNotLoaded"}
			var dp = data.lookup[met][data.cat];

			var scalar = (data.cat==="emp" ? 1000 : 1)

			var row0 = [titleText("num15"), titleText("sh15"), titleText("gr1013"), titleText("gr1315")];

			var row1 = [
				scope.format.num(dp.num15*scalar),
				scope.format.share(dp.sh15),
				scope.format.pctchg(dp.gr1013),
				scope.format.pctchg(dp.gr1315)
			];
			var row3 = [
				"Rank: xth",
				"Rank: xth",
				"Rank: xth",
				"Rank: xth"
			];
			
			var rows = dom.dp.wrap.selectAll("div.aidp-rows").data([row0,row1,row3]);
			rows.enter().append("div").classed("aidp-rows",true);
			rows.exit().remove();
			rows.classed("ai-datapoint",function(d,i){return i===1})
			rows.classed("ai-footer", function(d,i){return i===2});

			var cells = rows.selectAll("p.aidp-cells").data(function(d,i){return d});
			cells.enter().append("p").classed("aidp-cells",true);
			cells.exit().remove();

			cells.text(function(d,i){return d});

			function highlightCell(){
				var cells = dom.dp.indicators.selectAll("div").data(["num15", "sh15", "gr1013", "gr1315"]);
				cells.enter().append("div");
				cells.classed("dp-selected",function(d,i){
					return data.var===d;
				});
			}
			highlightCell();

			cells.on("mousedown", function(d,i){
				data.var = data.vars[i];
				drawChart();
				highlightCell();
			})
			.style("cursor","pointer");

			var title = d3.select("#ai2016title0").select("p");
			title.html('<span style="font-weight:700">' + data.lookup[met].metname + '</span> at a glance');
		}
		catch(e){
			console.log(e);
			dom.dp.wrap.selectAll("div").remove(); //remove all data points
		}
	}

	function setMetro(metro){
		dom.select.metro.node().value = metro;
		data.metro = metro;
		drawDataPoints();
	}

	return null;

	function setSelect(){

		dom.select = {};
		var selwrap1 = dom.menu.append("div").classed("half-width",true);
		var selwrap2 = dom.menu.append("div").classed("half-width",true);

		selwrap1.append("p").text("SELECT A METRO AREA").style({"margin":"3px 5px", "font-size":"11px", "color":"#666666"});
		dom.select.metro = selwrap1.append("select").style({"width":"90%"});
		selwrap2.append("p").text("SELECT A RACE / ETHNICITY").style({"margin":"3px 5px", "font-size":"11px", "color":"#666666"});
		dom.select.race = selwrap2.append("select").style({"width":"90%"});
		
		var options = dom.select.metro.selectAll("option").data(data.metros);
		options.enter().append("option");
		options.exit().remove();
		options.attr("value",function(d,i){return d.cbsa});
		options.text(function(d,i){return d.name});

		var opt = dom.select.race.selectAll("option").data([{c:"All", l:"All races/ethnicities"}, 
															{c:"White", l:"White"}, 
															{c:"Black", l:"Black"}, 
															{c:"Hispanic", l:"Hispanic"}]);
		opt.enter().append("option");
		opt.exit().remove();
		opt.attr("value",function(d,i){return d.c});
		opt.text(function(d,i){return d.l});
	}

	function drawCharts(){
		//need to modify title information based on data
		dat = getData();

		var maxBar = 350;
		var col = "#c1272d";

		var maxSingle = d3.max(dat.single.disadvantage, function(d,i){return d.share});
		var maxMulti = d3.max(dat.multi.disadvantage, function(d,i){return d.share});

		var anyNA1 = false;
		var anyNA2 = false;

		//it is possible that all values are null -- account for that

		var NH1 = Math.round(maxBar*maxSingle);
		var NH2 = Math.round(maxBar*maxMulti)
		var newHeight1 = NH1 < 170 || !maxSingle ? 170 : NH1;
		var newHeight2 = NH2 < 170 || !maxMulti ? 170 : NH2;
		var topPad = 50;

		var g1 = dom.charts.single.selectAll("div").data(dat.single.disadvantage);
		g1.enter().append("div").classed("one-fifth",true).append("svg").style({"width":"100%", "border-bottom":"1px solid #dddddd"})
			.append("g").classed("single-bar-chart",true).attr("transform","translate(0,"+topPad+")");
		g1.exit().remove();

		var g1Titles = g1.selectAll("p").data(function(d,i){return [d.title]});
		g1Titles.enter().append("p");
		g1Titles.exit().remove();
		g1Titles.html(function(d,i){return d}).style({"text-align":"center","margin":"0px 10px"}).classed("responsive-text",true);

		var g1g = g1.select("g.single-bar-chart");

		var g1b = g1g.selectAll("rect").data(function(d,i){return [d]});
		g1b.enter().append("rect").attr({"width":"50%", "x":"25%", "fill":col, "stroke":"none"});
		g1b.exit().remove();
		g1b.transition()
			.attr("height", function(d,i){return d.share*maxBar})
			.attr("y", function(d,i){return newHeight1-(d.share*maxBar)});

		var g1t = g1g.selectAll("text.front-text").data(function(d,i){return [d]});
		g1t.enter().append("text").classed("front-text",true).attr({"x":"50%", "text-anchor":"middle"});
		g1t.exit().remove();
		g1t.text(function(d,i){return format.share(d.share)} ).classed("responsive-text",true);
		g1t.attr("fill",function(d,i){
			if(d.share===null){anyNA1 = true}
			return col;
		}).transition().attr("y",function(d,i){
			return newHeight1-(d.share*maxBar)-3;
		});


		var g2 = dom.charts.multi.selectAll("div").data(dat.multi.disadvantage);
		g2.enter().append("div").classed("one-fifth",true).append("svg").style({"width":"100%", "border-bottom":"1px solid #dddddd"})
			.append("g").classed("single-bar-chart",true).attr("transform","translate(0,"+topPad+")");
		g2.exit().remove();

		var g2Titles = g2.selectAll("p").data(function(d,i){return [d.title]});
		g2Titles.enter().append("p");
		g2Titles.exit().remove();
		g2Titles.html(function(d,i){return d}).style({"text-align":"center", "margin":"0px 10px"}).classed("responsive-text",true);

		var g2g = g2.select("g.single-bar-chart");

		var g2b = g2g.selectAll("rect").data(function(d,i){return [d]});
		g2b.enter().append("rect").attr({"width":"50%", "x":"25%", "fill":col, "stroke":"none"});
		g2b.exit().remove();
		g2b.transition()
			.attr("height", function(d,i){return d.share*maxBar})
			.attr("y", function(d,i){return newHeight2-(d.share*maxBar)});

		var g2t = g2g.selectAll("text.front-text").data(function(d,i){return [d]});
		g2t.enter().append("text").classed("front-text",true).attr({"x":"50%", "text-anchor":"middle"});
		g2t.exit().remove();
		g2t.text(function(d,i){return format.share(d.share)} ).classed("responsive-text",true);
		g2t.attr("fill",function(d,i){
			if(d.share===null){anyNA2 = true}
			return col;
		}).transition().attr("y",function(d,i){
			return newHeight2-(d.share*maxBar)-3;
		});	

		dom.charts.single.selectAll("svg").transition().style("height", (newHeight1+topPad)+"px");	
		dom.charts.multi.selectAll("svg").transition().style("height", (newHeight2+topPad)+"px");

		var geo1 = dat.single.geo.cbsa === "88888" ? "THE 100 LARGEST METRO AREAS" : dat.single.geo.name.toUpperCase();
		var geo2 = dat.multi.geo.cbsa === "88888" ? "THE 100 LARGEST METRO AREAS" : dat.multi.geo.name.toUpperCase();

		dom.charts.sub1.html('SHARE OF THE ADULT POPULATION IN <b>' + geo1 + "</b>, 2014");
		dom.charts.sub2.html('SHARE OF THE ADULT POPULATION IN <b>' + geo2 + "</b>, 2014");

		dom.note1.style("display", anyNA1 ? "block" : "none");
		dom.note2.style("display", anyNA2 ? "block" : "none");
	}

	function getData(){
		var metro = dom.select.metro.node().value;
		var race = dom.select.race.node().value;
		var single = data.single.map[metro][race][0];
		var multi = data.multi.map[metro][race][0];
		return {single:single, multi:multi};
	}

	function run(){
		if(data.single && data.multi){

			var t1wrap = dom.charts.singleWrap.append("div").style("padding","5px 10px");
			t1wrap.append("p").text("Dimensions of disadvantage").style({"font-size":"22px"});
			dom.charts.sub1 = t1wrap.append("p").text("SHARE OF THE ADULT POPULATION, 2014").style({"font-size":"11px", color:"#666666"});
			dom.charts.single = dom.charts.singleWrap.append("div").style({"border":"1px solid #aaaaaa","padding":"5px"}).classed("c-fix",true);

			var t2wrap = dom.charts.multiWrap.append("div").style("padding", "5px 10px");
			t2wrap.append("p").text("Clustered, or multidimensional disadvantage").style({"font-size":"22px"});
			dom.charts.sub2 = t2wrap.append("p").text("SHARE OF THE ADULT POPULATION, 2014").style({"font-size":"11px", color:"#666666"});
			dom.charts.multi = dom.charts.multiWrap.append("div").style({"border":"1px solid #aaaaaa","padding":"5px"}).classed("c-fix",true);

			dom.note1 = d3.select("#md-graphics-note1");
			dom.note2 = d3.select("#md-graphics-note2");

			//{1} - build select menus
			setSelect();
			//{2} - add callbacks
			dom.select.metro.on("change",drawCharts);
			dom.select.race.on("change",drawCharts);

			drawCharts();

		}
	}


})(); //end of closure