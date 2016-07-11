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
	data.scale = null;
	data.accessor = null;

	//container for dom references and metadata
	var dom = {svgsupport:true};
	dom.wrap = d3.select("#ai2016wrap");
	
	dom.chart = {};
	dom.chart.orientation = "landscape";
	dom.chart.wrap = d3.select("#ai2016chart");
	dom.chart.svg = dom.chart.wrap.append("svg");
	dom.chart.svg.anno = dom.chart.svg.append("g");
	dom.chart.svg.main = dom.chart.svg.append("g");

	dom.chart.xaxis = dom.chart.svg.append("g").classed("axis-group",true);
	dom.chart.yaxis = dom.chart.svg.append("g").classed("axis-group",true);

	dom.map = {};
	dom.map.wrap = d3.select("#ai2016map");

	dom.dp = {};
	dom.dp.wrap = d3.select("#ai2016at-a-glance"); //selectable datapoints
	dom.dp.indicator_table = d3.select("#ai2016indicator-bar"); //indicate which data point has been selected
	dom.dp.indicators = dom.dp.indicator_table.append("div");

	dom.select = {};
	dom.select.jobs = d3.select("#ai2016-jobs-button").datum("emp").classed("ai2016-bluetext",true);
	dom.select.gdp = d3.select("#ai2016-gdp-button").datum("gdp");
	dom.select.cat = d3.selectAll(".ai2016-button");
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
		o.num = function(v){
			if(data.cat==="emp"){
				var scalar = 1000;
				var pre = "";
			} 
			else{
				var scalar = 1;
				var pre = "$";
			};
			return v===null ? "NA" : pre + d3num(v*scalar);
		};
		o.share = function(v){return v===null ? "NA" : d3share(v)};
		o.pctchg = function(v){return v===null ? "NA" : d3pctchg(v)};
		o.n = function(v){return v===null ? "NA" : d3num(v)}
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

		row.emp.r_num10 = d.RANK100_AIEMP2010;
		row.emp.r_num13 = d.RANK100_AIEMP2013;
		row.emp.r_num15 = d.RANK100_AIEMP2015;
		row.emp.r_sh15 = d.RANK100_AIEMPSHARE2015;
		row.emp.r_gr1013 = d.RANK100_AIEMP_GR_2010_2013;
		row.emp.r_gr1015 = d.RANK100_AIEMP_GR_2010_2015;
		row.emp.r_gr1315 = d.RANK100_AIEMP_GR_2013_2015;

		row.gdp = {};
		row.gdp.num10 = coerce2num(d.AIGDP2010);
		row.gdp.num13 = coerce2num(d.AIGDP2013);
		row.gdp.num15 = coerce2num(d.AIGDP2015);
		row.gdp.sh15 = coerce2num(d.AIGDPSHARE2015);
		row.gdp.gr1013 = coerce2num(d.AIGDP_GR_2010_2013);
		row.gdp.gr1015 = coerce2num(d.AIGDP_GR_2010_2015);
		row.gdp.gr1315 = coerce2num(d.AIGDP_GR_2013_2015);

		row.gdp.r_num10 = d.RANK100_AIGDP2010;
		row.gdp.r_num13 = d.RANK100_AIGDP2013;
		row.gdp.r_num15 = d.RANK100_AIGDP2015;
		row.gdp.r_sh15 = d.RANK100_AIGDPSHARE2015;
		row.gdp.r_gr1013 = d.RANK100_AIGDP_GR_2010_2013;
		row.gdp.r_gr1015 = d.RANK100_AIGDP_GR_2010_2015;
		row.gdp.r_gr1315 = d.RANK100_AIGDP_GR_2013_2015;

		return row;
	}

	d3.csv(scope.repo+"AI100Data.csv", parser, function(dat){
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

		drawChart();
		setMetro(data.metro);

		dom.select.metro.on("change",function(d,i){
			if(this.value===data.metro){return null}
			setMetro(this.value);
		})

		dom.select.cat.on("mousedown",function(d,i){
			data.cat = d;
			dom.select.cat.classed("ai2016-bluetext", function(D,I){return D==d});
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
		if(v==="num15"){var title = "Advanced industries " + (data.cat === "emp" ? "jobs" : "output (millions of dollars)") + ", 2015";}
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
			var accessor = data.accessor = function(d){return d[data.cat][data.var];}

			//array of metro codes sorted by selected variable
			var current_metro_order = data.cut.slice(0)
										.sort(function(a,b){return accessor(a)-accessor(b)})
										.map(function(d,i,a){return d.metro}); 

			var indexof = function(metro){
				if(!!Array.prototype.indexOf){
					var I = current_metro_order.indexOf(metro);
				}
				else{
					for(var i=0; i<current_metro_order.length; i++){
						if(current_metro_order[i]==metro){
							var I = i;
							break;
						}
					}
				}
				return I;
			}

			//only bind data once
			if(!data.selection){
				data.selection = dom.chart.svg.main.selectAll("g.bar").data(data.cut, function(d,i){return d.metro});
				var E = data.selection.enter().append("g").classed("bar", true).style("pointer-events","all");
				E.append("rect").style("shape-rendering","crispEdges");
				E.append("path").style("shape-rendering","crispEdges");
				E.append("line");
				E.append("circle").classed("highlight",true).attr({"r":"9", "cx":"0", "cy":"0", "stroke-width":"1", "stroke":"#ffcf1a", "fill":"#ffcf1a"}).style("display","none");
				E.append("circle").classed("marker",true).attr({"r":"4", "cx":"0", "cy":"0"});
				E.append("text").classed("highlight",true).style({"display":"none","font-size":"0.8em","color":"#666666"}).text(function(d,i){return d.metname});
				E.append("text").classed("marker",true).style({"display":"none","font-size":"0.8em","color":"#666666"}).text(function(d,i){return d.metname});

				data.selection.exit().remove();		
				data.selection.sort(function(a,b){
					return accessor(a) - accessor(b);
				});		
			}

			//for easier reference
			var sel = data.selection; 
			var cut = data.cut;

			if(data.var in {gr1013:1, gr1315:1}){
				var range = data.ranges[data.cat].growth;
			}
			else{
				var range = data.ranges[data.cat][data.var];
			}
			if(range[0] > 0){range[0] = 0}

			var scale = d3.scale.linear().domain([range[0]*1.05, range[1]*1.05]).range([0, width]);
			var ordscale = d3.scale.ordinal().domain(current_metro_order);
			data.scale = scale;
			data.ordscale = ordscale;

			var lines = sel.selectAll("line").style("pointer-events","none");;
			var dots = sel.selectAll("circle").style("pointer-events","none");;
			var rects = sel.selectAll("rect").attr({"fill":"none", "stroke":"none"});
			var paths = sel.selectAll("path").attr({"fill":"none", "stroke":"#555555", "stroke-width":"3px"}).style("pointer-events","none");
			var texts = sel.selectAll("text").style("pointer-events","none");

			texts.text(function(d,i){return d.metname + " (" + scope.varfmt[data.var](accessor(d)) + ")"});

			//responsive layout -- column chart for wide viewport, bar chart for narrow viewport
			if(width < 780){
				dom.chart.orientation = "portrait";
				dom.chart.svg.main.attr("transform", "translate(15,55)");
				dom.chart.svg.anno.attr("transform", "translate(15,55)");
				dom.chart.xaxis.attr("transform","translate(15,40)");
				
				var height = (4*cut.length);
				var svg_height = height+75;

				scale.range([0, width-30]); //width of bars
				ordscale.rangeRoundPoints([0, height], 1);
				
				var ticks = scale.ticks(5);
				xaxis.tickValues(ticks);
				yaxis.tickValues(null);

				var gridlines = dom.chart.svg.anno.selectAll("line").data(ticks);
				gridlines.enter().append("line");
				gridlines.exit().remove();

				gridlines.attr("stroke",function(d,i){return d==0 ? "#aaaaaa" : "#e0e0e0"})
						 .style("shape-rendering", "crispEdges")
						 .transition().duration(1200).delay(0)
						 .attr({"y1":"-15", "y2":height+30})
						 .attr("x1", function(d,i){
						 	return scale(d);
						 })
						 .attr("x2", function(d,i){
						 	return scale(d);
						 });

				sel.transition()
				.duration(1200)
				.delay(0)
				.attr("transform", function(d,i){return "translate(0,"+ ordscale(d.metro) +")"});

				lines
				.style("shape-rendering","auto")
				.attr("stroke",function(d,i){
					var D = accessor(d);
					return D < 0 ? "#dc2a2a" : "#0d73d6";
				})
				.transition()
				.duration(1200)
				.delay(0)
				.attr({y1:0, y2:0, x1:scale(0)})
				.attr("x2", function(d,i){
					return scale(accessor(d));
				})
				.each("end",function(){d3.select(this).style("shape-rendering","crispEdges")});

				dots
				.attr("fill",function(d,i){
					var D = accessor(d);
					if(i===1){
						var col = D < 0 ? "#dc2a2a" : "#0d73d6";
					}
					else{
						var col = "#ffcf1a";
					}
					return col;
				})
				.transition()
				.duration(1200)
				.delay(0)
				.attr("cy",0)
				.attr("cx", function(d,i){
					return scale(accessor(d));
				})
				.attr("r",function(d,i){return i===1 ? 2 : 5});;

				dom.chart.svg.style({"width":"100%", "height":svg_height+"px"});
				xaxis.scale(scale).tickFormat(scope.varfmt[data.var]);

				dom.chart.xaxis.style("display","inline").transition().duration(1200).call(xaxis);
				dom.chart.yaxis.style("display","none");

				rects.attr({"width":width-30, "height":"5", "x":"0", "y":"-2"});
				texts.style("display","none");
				paths.style("display","none");
			}
			else{
				dom.chart.orientation = "landscape";

				dom.chart.svg.main.attr("transform", "translate(70,0)"); //plot area
				dom.chart.svg.anno.attr("transform", "translate(70,0)"); //annotation area
				dom.chart.yaxis.attr("transform","translate(70,0)"); //y-axis

				var height = 450;
				var svg_height = height + 0;
				
				scale.range([425, 25]);
				ordscale.rangeRoundBands([10, width-80], 0, 0);
				var step = ordscale.rangeBand();

				var ticks = scale.ticks(5);
				yaxis.tickValues(ticks);
				xaxis.tickValues(null);

				var gridlines = dom.chart.svg.anno.selectAll("line").data(ticks);
				gridlines.enter().append("line");
				gridlines.exit().remove();

				gridlines.attr("stroke",function(d,i){return d==0 ? "#aaaaaa" : "#e0e0e0"})
						 .style("shape-rendering", "crispEdges")
						 .transition().duration(1400).delay(0)
						 .attr({"x1":"0", "x2":width-80})
						 .attr("y1", function(d,i){
						 	return scale(d);
						 })
						 .attr("y2", function(d,i){
						 	return scale(d);
						 });

				sel.transition()
				.duration(1400)
				.delay(0)
				.attr("transform", function(d,i){
					return "translate("+ ordscale(d.metro) +",0)";
				});

				lines
				.style("shape-rendering","auto")
				.attr("stroke",function(d,i){
					var D = accessor(d);
					return D < 0 ? "#dc2a2a" : "#0d73d6";
				})
				.transition().duration(1400).delay(0)
				.attr({x1:0, x2:0, y1:425})
				.attr("y1", function(d,i){
					var o = scale(0);
					return o;
				})
				.attr("y2", function(d,i){
					var y = scale(accessor(d));
					return y; 
				})
				.each("end",function(){d3.select(this).style("shape-rendering","crispEdges")});

				dots
				.transition().duration(1400).delay(0)
				.attr("fill",function(d,i){
					var D = accessor(d);
					if(i===1){
						var col = D < 0 ? "#dc2a2a" : "#0d73d6";
					}
					else{
						var col = "#ffcf1a";
					}
					return col;
				})
				.attr("cx",0)
				.attr("cy", function(d,i){
					var y = scale(accessor(d));
					return y; 
				})
				.attr("r",function(d,i){return i===1 ? 4 : 9});

				paths
				.style("display",function(d,i){return d.metro === data.metro ? "inline" : "none"})
				.transition().duration(1400).delay(0)
				.attr("d", function(d,i){
					var v = accessor(d);
					if(v >= 0){
						var y = scale(0);
					}
					else{
						var y = scale(accessor(d));
					}

					return v >= 0 ? "M0,"+y+" l0,5" : "M0,"+y+" l0,15";
				});



				dom.chart.svg.style({"width":"100%", "height":svg_height+"px"});
				yaxis.scale(scale).tickFormat(scope.varfmt[data.var]);
				dom.chart.yaxis.style("display","inline").transition().duration(1000).call(yaxis);
				dom.chart.xaxis.style("display","none");

				rects.attr({"width":step, "height":"400", "x":0-(step/2), "y":"25"});

				texts
				.transition().duration(1400).delay(0)
				.attr("text-anchor", function(d,i){
					return indexof(d.metro) < 50 ? "start" : "end";
				})
				.attr("dx", function(d,i){
					if(i===1){
						return indexof(d.metro) < 50 ? -10 : 10;
					}
					else{
						return indexof(d.metro) < 50 ? -4 : 4;
					}
					
				})
				.attr("y",function(d,i){
					if(i===1){
						var y = 0
					}
					else{
						var val = accessor(d);
						if(val > 0){
							var y = scale(0) + 16;
						}
						else{
							var y = scale(val) + 26;
						}
					}
					return y;
				})
				.style("display", function(d,i){
					return i===0 && d.metro===data.metro ? "inline" : "none";
				});
			}

			function highlight(d,i){
				var thiz = d3.select(this);
				var args = arguments;

				var rect = thiz.selectAll("rect").attr("fill", arguments.length===0 ? "none" : "#e0e0e0");

				if(dom.chart.orientation==="landscape"){
					var bottom = 22;

					var text = thiz.selectAll("text.marker").style("display", function(d,i){
						return args.length===0 ? "none" : "inline";
					});

					text.attr("y", bottom);
				}
				else{
					//no-op
				}
			}

			sel.on("mouseenter",function(d,i){
				drawDataPoints(d.metro);
				highlight.call(this, d, i);
			});
			sel.on("mouseleave",function(d,i){
				drawDataPoints();
				highlight.call(this);
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

		try{
			dp_box = dom.dp.wrap.node().getBoundingClientRect();
			dp_width = (dp_box.right - dp_box.left)+"px";
		}
		catch(e){
			dp_width = "auto";
		}
		
		dom.dp.indicator_table.style("width", dp_width); 		
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

			var row0 = [titleText("num15"), titleText("sh15"), titleText("gr1013"), titleText("gr1315")];

			var row1 = [
				scope.format.num(dp.num15),
				scope.format.share(dp.sh15),
				scope.format.pctchg(dp.gr1013),
				scope.format.pctchg(dp.gr1315)
			];
			var row3 = [
				"Rank: "+dp.r_num15,
				"Rank: "+dp.r_sh15,
				"Rank: "+dp.r_gr1013,
				"Rank: "+dp.r_gr1315
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

			//detailed industry tables
			var ind = data.lookup[met].ind;
			var numjobstable = d3.select("#ai2106-ind0");
			var rows = numjobstable.select("tbody").selectAll("tr").data(ind);
			rows.enter().append("tr");
			rows.exit().remove();

			var cells = rows.selectAll("td").data(function(d,i){
				return [d.name, scope.format.n(d.emp), scope.format.share(d.sh), scope.format.pctchg(d.gr1315)];
			});
			cells.enter().append("td");
			cells.exit().remove();

			numjobstable.selectAll("tr").selectAll("td, th")
			.style("width", function(d,i){
				return i===0 ? "40%" : "20%";
			})
			.style("text-align", function(d,i){
				return i===0 ? "left" : "right";
			})
			.style("padding",function(d,i){
				if(i===0){
					var p = "8px 5px 3px 3px";
				}
				else if(i===3){
					var p = "8px 3px 3px 5px";
				}
				else{
					var p = "8px 10px 3px 10px";
				}
				return p;
			})
			.style({"vertical-align":"bottom", "border":"1px solid #aaaaaa", "border-width":"0px 0px 1px 0px"})

			cells.text(function(d,i){return d});


			var title0 = d3.select("#ai2016title0").select("p");
			title0.html('<span style="font-weight:700">' + data.lookup[met].metname + '</span> at a glance');

			var title1 = d3.select("#ai2016title1");
			title1.html('<span style="font-weight:700">' + data.lookup[met].metname + '</span> industrial detail');

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

		if(!!data.selection && !!data.accessor && !!data.scale){
			data.selection.selectAll("circle.highlight").style("display", function(d,i){
				return d.metro === metro ? "inline" : "none";
			});

			data.selection.selectAll("line").attr("stroke-width",function(d,i){return d.metro === metro ? (dom.chart.orientation=="landscape" ? 5 : 3) : 1});
			
			if(dom.chart.orientation=="landscape"){
				data.selection.selectAll("text.highlight").style("display",function(d,i){return d.metro === metro ? "inline" : "none"});
				data.selection.selectAll("path").style("display",function(d,i){return d.metro === metro ? "inline" : "none"});
			}

			//make sure selected bar is on top
			data.selection.sort(function(a,b){
				if(a.metro === metro){var r = 1}
				else if(b.metro === metro){var r = -1}
				else {var r = 0}
				return r;
			});	

		}
	}

})(); //end of closure