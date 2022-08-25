// 참조 : https://ichi.pro/ko/d3js-v6-hwagdae-chugso-paeneol-eul-mandeuneun-bangbeob-81588312837289

const ApsTimelineConfig = {
    productionDataset: null,
    downtimeDataset: [],
    container: "#test_02",
    top: {
        accessor: d => d["G"],
        domain: [300, 1700]
    },
    bottom :{
        accessor: d => d["W"],
        domain: [300, 17000]
    },
    dims: {
        width: 1800, //screen.width - 500,
        height: 200,
        axisXSize : 10,
        margin: {top: 0, right: 40, bottom: 5, left: 40,},
    },
    navigator: false, // 위에 작은 패널이 나오는지 여부
}


d3.json("/get_timeline_data", {
    method: "POST",
    body: JSON.stringify({
        date: Date.now(),
    })
}).then((data) => {
    if (ApsTimelineConfig.dims.height < 200) {
        console.log("높이는 최소 200 이상이어야 합니다.")
        ApsTimelineConfig.dims.height = 200
    }
    ApsTimeline(data["ProductionData"], data["DowntimeData"], ApsTimelineConfig) 
}).catch((error) => {
    console.error("Error loading the data: " + error);
});


let mouseoverFunc = function (e, d, bounds, tooltip) {
    bounds.select('.tooltip').style('display', null);
    tooltip.select("text.id_feature")
        .text(`${d.MoNo}`);
    tooltip.select('text.value_feature')
        .text(`${Math.round(d.Duration)}`);
    tooltip
        .attr('transform', `translate(${[d3.pointer(e)[0] - 5, d3.pointer(e)[1] - 25]})`);            
}


let DrawTooltip = function(tooltipPanel) {
    
    tooltipPanel.append("rect")
        .attr("width", 100)
        .attr("height", 100)
        .attr("fill", "white")
        .style("opacity", 0.7);

    tooltipPanel.append("text")
        .attr('class', 'id_feature')
        .attr("x", 25)
        .attr("dy", "1.2em")
        .style("text-anchor", "middle")
        .attr("font-size", "14px");

    tooltipPanel.append("text")
        .attr('class', 'value_feature')
        .attr("x", 25)
        .attr("dy", "2.4em")
        .style("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("font-weight", "bold");
}

function ApsTimeline(productionDataset, downtimeDataset, ApsTimelineConfig) {

    var subContainers = ["timeline-panel", "timeline"] ;
    var containterName = ApsTimelineConfig.container
    d3.select(containterName).selectAll('div')
      .data(subContainers)
      .enter()
      .append('div')
      .text(function(d) { return d; })
      .attr("id", d => d);

    let configNav = {...ApsTimelineConfig}
    configNav.dims = {...ApsTimelineConfig.dims}
    configNav.container = subContainers[0]
    configNav.NavMode = true
    configNav.NavFunc = DrawApsTimeline
    
    let configTimeline = {...ApsTimelineConfig}
    configTimeline.dims = {...ApsTimelineConfig.dims}
    configTimeline.container = subContainers[1]
    configTimeline.NavMode = true
    configTimeline.NavFunc = function(productionDataset, downtimeDataset, downtimeDataset) {
        console.log(productionDataset)
    }

    configNav.configTimeline = configTimeline

    if (ApsTimelineConfig.navigator) {
        configNav.dims.height = 60
        configTimeline.dims.height = ApsTimelineConfig.dims.height - 60
        
        DrawApsTimeline(productionDataset, downtimeDataset, configNav )
    }
    DrawApsTimeline(productionDataset, downtimeDataset, configTimeline )    

    

    function DrawApsTimeline(productionDataset, downtimeDataset, config) {
        document.getElementById(config.container).innerHTML = ""
        const yTop = config.top.accessor
        const yBot = config.bottom.accessor
    
        let dims = {
            width: config.dims.width,
            height: config.dims.height,
            axisXSize : (config.dims.axisXSize)?config.dims.axisXSize:20,
            margin: {...config.dims.margin},
        }
    
        let eachHeight = (dims.height - dims.axisXSize - dims.margin.top - dims.margin.bottom) /2
        
        let dimsTop = {
            height: eachHeight,
            margin: {top: dims.margin.top},
        }
        
        let dimsBot = {
            height: eachHeight,
            margin: {top: dims.margin.top + eachHeight + dims.axisXSize},
        }    
    
        let wrapper = d3.select('#' + config.container)
            .append("svg")
            .attr("viewBox", "0 0 " + dims.width + " " + dims.height)
            // .attr("width", dims.width)
            // .attr("height", dims.height)
    
        let chartStartsAt = productionDataset[0]["StartDate"]
        let chartEndsAt = productionDataset[productionDataset.length - 1]["EndDate"]
    
        let xScale = d3.scaleTime()
            .domain([chartStartsAt, chartEndsAt])
            .range([dims.margin.left, dims.width - dims.margin.right])
    
        let yScaleTop = d3.scaleLinear()
            .domain(config.top.domain?config.top.domain:d3.extent(productionDataset, yTop))
            .range([dimsTop.height, 0])
    
        let yScaleBot = d3.scaleLinear()
            .domain(config.bottom.domain?config.bottom.domain:d3.extent(productionDataset, yBot))
            .range([dimsBot.height, 0])
    
        let bounds = wrapper.append("g")
    
        var g = bounds.selectAll("rect")
            .data(productionDataset)
            .enter()
            .append("g")
            .classed('rect', true)
        

        var top = g.append("rect")
            .attr("class", d => d["Work"]?"work":"downtime")
            .attr("x", d => xScale(d["StartDate"]))
            .attr("y",  d => dimsTop.margin.top + yScaleTop(yTop(d)))
            .attr("height",d => {
                return dimsTop.height - yScaleTop(yTop(d))
            })
            .attr("width", d => xScale(d["EndDate"]) - xScale(d["StartDate"]))
            // .attr("pointer-events", "all")
            // brush가 있으면 마우스 이벤트가 안탐
            .on("mouseover", function(e, d) {mouseoverFunc(e, d, bounds, tooltip)})
            .on("mouseleave", function (e, d) {
                bounds.select('.tooltip').style('display', 'none');
                // console.log("rect leave", d)
                // mouseover(d, i, datum);
            })          
            .on("mousedown", (e, d) => {
                // const e = top.nodes();
                // const i = e.indexOf(this);
                console.log("rect mousedown", d)
              })
    
        var bot = g.append("rect")
            .attr("class", d => d["Work"]?"work":"downtime")
            .attr("x", d =>xScale(d["StartDate"]))
            .attr("y", d => dimsBot.margin.top )
            .attr("height",d => {
                // console.log(yScaleBot(yBot(d)), dimsBot.margin.top + yScaleBot(yBot(d)))
                return dimsBot.height - yScaleBot(yBot(d))
            })
            .attr("width", d => xScale(d["EndDate"]) - xScale(d["StartDate"]))
            // brush가 있으면 마우스 이벤트가 안탐
            .on("mouseover", function(e, d) {mouseoverFunc(e, d, bounds, tooltip)})
            .on("mouseleave", function (e, d) {
                bounds.select('.tooltip').style('display', 'none');
                // console.log("rect leave", d)
                // mouseover(d, i, datum);
            })        
              .on("mousedown", function (e, d) {
                console.log("rect mousedown", d)
                // click(d, index, datum);
            })           
    
        const timeScale = d3.scaleTime()
            .domain([new Date(chartStartsAt*1000), new Date(chartEndsAt*1000)])
            .range([dims.margin.left, dims.width - dims.margin.right])
    
        const axisX = bounds.append("g")
        // .attr("class", "axis")    
            .attr("transform", "translate(0," + (dims.margin.top + dimsTop.height) + ")")
            // .attr("stroke","steelBlue")
            .attr("stroke-width","1")
            .attr("opacity","6");
    
        // const ticks = (chartEndsAt - chartStartsAt)/3600 > 2?
    
        s = (chartEndsAt - chartStartsAt)/(60 * 60 * 24)
        if (s < 3)
            axisX.call(d3.axisBottom(timeScale).tickSize(6).ticks(d3.timeHour).tickFormat(d3.timeFormat("%H"))) //.tickFormat(d3.timeFormat("%a %H:%M")))
        else if (s < 5)
            axisX.call(d3.axisBottom(timeScale).tickSize(6).ticks(d3.timeHour.every(3)).tickFormat(d3.timeFormat("%H"))        )
        else 
            axisX.call(d3.axisBottom(timeScale).tickSize(6).ticks(d3.timeDay).tickFormat(d3.timeFormat("%m-%d")))
    
        if (config.NavMode) {
            makeBrush(config.NavFunc)
        }

        const tooltip = bounds.append("g")
        .attr("class", "tooltip")
        .style("display", "none");    

    
        DrawTooltip(tooltip)

        function makeBrush(callback) {
            //https://bl.ocks.org/mthh/99dc420cd7e276ecafe4ef4bf12c6927
            var brushed = function({selection}) {
                
                if(selection === null) {
                    top.attr("stroke", null)
                }
    
                if (selection) {
                    let startBrush = xScale.invert(selection[0]) / 1000
                    let endBrush = xScale.invert(selection[1]) / 1000
                    if (selection[0] > 0) {
                        // document.getElementById("timeline").innerHTML = ""
                        // top.attr("fill", d => startBrush <= d && d <= endBrush? "red" : null)
                        let {productionDatasetUpdated, downtimeDatasetUpdated} = updateDatasets(productionDataset, startBrush, endBrush);
                        
                        callback(productionDatasetUpdated, downtimeDatasetUpdated, config.configTimeline);
                    }
                }
    
                // d3.select(this).call(brushHandle, selection);
            }
    
            const brush = d3.brushX()
                .extent([
                    [dims.margin.left, 0.5], 
                    [dims.width - dims.margin.right, dims.height + 0.5]
                ])
                .handleSize(20)
                // .on("start brush end", brushed)
                // .on("start", function() {})
                // .on("brush", function() {})
                .on("end", brushed)
                
                
        
            wrapper.append("g")
                .attr("class", "x brush")
                .on("dblclick", console.log("dblclick"))
                .on("mousedown mousemove", function(event) {
                    // console.log(event)
                    dispatchMouseEvent(event)
                })
                .call(brush)
                // .call(brush.move, [xScale(chartStartsAt), xScale(chartEndsAt)])
                
        }
    
        prevElem = null
        prevEvent = null
        
        function dispatchMouseEvent(event) {
            const elems = document.elementsFromPoint(event.pageX, event.pageY)
            const elem = elems.find(e => (e.className.baseVal === 'work' || e.className.baseVal === 'downtime'));
    
            
            //  mouseleave 구현
            if(prevElem != null && elem != prevElem) {
                const newEvent = new MouseEvent("mouseleave", {
                    pageX : event.pageX,
                    pageY : event.pageY,
                    clientX: event.clientX,
                    clientY: event.clientY,
                    bubbles: true,
                    cancelable: true,
                    view: window
                })
                prevElem.dispatchEvent(newEvent);        
            }
    
    
            if(elem) {
                const newEvent = new MouseEvent(event.type, {
                    pageX : event.pageX,
                    pageY : event.pageY,
                    clientX: event.clientX,
                    clientY: event.clientY,
                    bubbles: true,
                    cancelable: true,
                    view: window
                })
                elem.dispatchEvent(newEvent);
            }
    
            // mouseover 구현
            if(elem != null && elem != prevElem) {
                const newEvent = new MouseEvent("mouseover", {
                    pageX : event.pageX,
                    pageY : event.pageY,
                    clientX: event.clientX,
                    clientY: event.clientY,
                    bubbles: true,
                    cancelable: true,
                    view: window
                })
                elem.dispatchEvent(newEvent);       
            }
    
            prevElem = elem;
            prevEvent = event;
    
    
        }
    
        function updateDatasets(productionDataset, startBrush, endBrush) {
            let productionDatasetUpdated
            productionDatasetUpdated = []
            let downtimeDatasetUpdated
            downtimeDatasetUpdated = []
            let startSearch = false
            let endSearch = false
        
            for (const actualElement of productionDataset) {
                if (!startSearch && +(actualElement["EndDate"] ) < +startBrush * 1000 ) {
                    continue;
                } else {
                    startSearch = true;
                }
        
                if (+(actualElement["StartDate"] / 1000) < +startBrush && +startBrush < +(actualElement["EndDate"] / 1000)) {
                    console.log("최초 선택")
                    productionDatasetUpdated.push(actualElement);
                } else if ((+(actualElement["StartDate"] / 1000) >= +startBrush) && (+(actualElement["StartDate"] / 1000) <= +endBrush)) {
                    // if (startBrushing) {
                        // console.log("First value from brush selection, inserting initial data into both datasets, based on actual value")
                        productionDatasetUpdated.push(actualElement);
                } else {
                    console.log("무시하기")
                    break;
                } 
            }
        
            endSearch = true
        
            return {productionDatasetUpdated, downtimeDatasetUpdated};
        }    
    }
    
    
}

