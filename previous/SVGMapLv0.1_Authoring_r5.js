// 
// Description:
//  SVG Map Authoring Tools Extention for > Rev.14 of SVGMap Level0.1 Framework
//  
//  Programmed by Satoru Takagi
//  
//  Copyright (C) 2016-2016 by Satoru Takagi @ KDDI CORPORATION
//  
// License: (GPL v3)
//  This program is free software: you can redistribute it and/or modify
//  it under the terms of the GNU General Public License version 3 as
//  published by the Free Software Foundation.
//  
//  This program is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU General Public License for more details.
//  
//  You should have received a copy of the GNU General Public License
//  along with this program.  If not, see <http://www.gnu.org/licenses/>.
// 
// History:
// Rev1: Rev11以前の内蔵システム
// 2016/12/16 Rev2: Start Porting from Rev11 code and Modularization
// 2016/12/21 Base FW Rev11のオーサリングコードとほぼ同等(以上)のものを移植完了 
// 2016/12/28 Rev3: Polygon/Polyline Tools
// 2017/01/30 Rev4: Rubber Band for Polyline/Polygon
// 2017/02/** Rev5: Point入力UIのTextArea使用を廃止する(for Tablet devices)
// 2017/03/17 zoomPanMap -> screenRefreshed (特別対応)
//
// ToDo,ISSUES:
//  POI以外の描画オブジェクトを選択したときに出るイベントbase fwに欲しい
//  編集UIを出した状態で、TypeError: svgImagesProps[layerId] is undefined[詳細]  SVGMapLv0.1_r14.js:3667:3

        

( function ( window , undefined ) { 
var document = window.document;
var navigator = window.navigator;
var location = window.location;

var svgMapAuthoringTool = ( function(){ 

	console.log("Hello this is svgMapAuthoringTool");


var editLayerTitle = ""; // 編集対象のレイヤーのtitle属性（もしくは
var action = "none"; // 起こしたアクションがなんなのか（かなりいい加減・・）2013/1 (for Dynamic Layer)


// handleResultに入れてある
//			var layers=getEditableLayers();


// 開いている編集UIに関するグローバル情報を入れているオブジェクト
// uiMapping = {uiPanel,editingDocId,editingMode,uiDoc,editingGraphicsElement,modifyTargetElement}
// uiPanel : オーサリングUIを発生させる(layer specific UI iframe中などの)div要素
// editingDocId : 編集中のSVG文書のID(svgMapProps[]などの)
// editingMode : POI,POLYLINE...
// uiDoc : uiPanelのオーナードキュメント(layer specific UI iframe中などのhtml)
// editingGraphicsElement : 図形要素を編集中かどうか(boolean)
// modifyTargetElement : 既存図形要素を改変中かどうか(そうならばその要素のNode)
// selectedPointsIndex,insertPointsIndex: Poly*用の編集対象ポイント ない場合は-1
var uiMapping = {};



function editPoint( x , y ){
	var geop = svgMap.screen2Geo( x , y );
	console.log("Get EditPoint event! :",geop);
//	POIAppend( geop , isEditingLayer().getAttribute("iid") ,"TEST");
	// まず、すべてのレイヤーイベントリスナ（含パンズーム）を停止させる?(やってない)
	// かわりに、指定したレイヤーのPOIに新しいイベントリスナーを設置する?
	// 
}

function POIAppend( geoLocation ,  docId  ,title){
	var layerSVGDOM = svgImages[docId];
	var layerCRS = svgImagesProps[docId].CRS;
	var symbols = getSymbols(svgImages[docId]);
	var metaSchema = layerSVGDOM.ownerDocument.documentElement.getAttribute("property").split(",");
	
	if ( layerCRS && layerSVGDOM && symbols ){
		var symbd = layerSVGDOM.getElementsByTagName("defs");
		if ( symbd[0].getElementsByTagName("g") ){
			var firstSymbol = null;
			for ( var key in symbols ){
				firstSymbol = symbols[key];
//				console.log(key);
				break;
			}
//			var symbolId = firstSymbol.getAttribute("id");
			var svgxy = Geo2SVG( geoLocation.lat , geoLocation.lng , layerCRS )
			var tf = "ref(svg," + svgxy.x + "," + svgxy.y + ")";
			var nssvg = layerSVGDOM.documentElement.namespaceURI;
			var poi = layerSVGDOM.createElementNS(nssvg,"use"); // FirefoxではちゃんとNSを設定しないと大変なことになるよ^^; 2013/7/30
			poi.setAttribute("x" , 0);
			poi.setAttribute("y" , 0);
//			poi.setAttribute("transform" , tf);
			poi.setAttributeNS(nssvg,"transform" , tf);
			poi.setAttribute("xlink:href" , "#" + firstSymbol.id);
			poi.setAttribute("xlink:title" , title);
			poi.setAttribute("content" , "null");
			layerSVGDOM.documentElement.appendChild(poi);
//			console.log(layerSVGDOM);
//			console.log("POIAppend::",poi.parentNode);
//			POIeditSelection(poi);
//			console.log("addPoi:",poi,poi.getAttribute("xtransform"),poi.getAttribute("transform"));
			dynamicLoad( "root" , mapCanvas );
//			console.log("call poi edit props");
			setTimeout(function(){POIeditProps(poi,true,symbols);},50);
		}
	}
}



function clearTools( e ){
	poiCursor.removeCursor();
	polyCanvas.removeCanvas();
	clearForms(uiMapping.uiDoc);
	if ( uiMapping.modifyTargetElement && uiMapping.modifyTargetElement.getAttribute("iid") && document.getElementById(uiMapping.modifyTargetElement.getAttribute("iid")) ){
		document.getElementById(uiMapping.modifyTargetElement.getAttribute("iid")).style.backgroundColor="";
	}
	console.log( "get iframe close/hide event from authoring tools framework.");
	svgMap.setRootLayersProps(uiMapping.editingDocId, true , false );
//	uiMapping = {};
	svgMap.refreshScreen();
}
function setTools( e ){
	console.log( "get iframe appear event from authoring tools framework.");
	svgMap.setRootLayersProps(uiMapping.editingDocId, true , true );
}

var svgImages, svgImagesProps;
function initPOItools(targetDiv,poiDocId,cbFunc,cbFuncParam){
	if ( cbFunc ){
		toolsCbFunc = cbFunc;
		toolsCbFuncParam = cbFuncParam;
	} else {
		toolsCbFunc = null;
		toolsCbFuncParam = null;
	}
	
	removeChildren(targetDiv);
	
	var uiDoc = targetDiv.ownerDocument;
	uiDoc.removeEventListener("hideFrame", clearTools, false);
	uiDoc.removeEventListener("closeFrame", clearTools, false);
	uiDoc.removeEventListener("closeFrame", setTools, false);
	uiDoc.addEventListener('hideFrame',clearTools);
	uiDoc.addEventListener('closeFrame',clearTools);
	uiDoc.addEventListener('appearFrame',setTools);
	
	console.log("called initPOItools: docId:",poiDocId);
	svgMap.setRootLayersProps(poiDocId, true , true ); // 子docの場合もあり得ると思う・・
	
	svgImages = svgMap.getSvgImages();
	svgImagesProps = svgMap.getSvgImagesProps();
	var symbols = svgMap.getSymbols(svgImages[poiDocId]);
	var metaSchema = svgImages[poiDocId].documentElement.getAttribute("property").split(",");
	
	var ihtml = '<table id="poiEditor"><tr><td colspan="2" id="iconselection" >';
	firstSymbol = true;
	for ( var key in symbols ){ // srcに相対パスが正しく入っているか？
		if ( symbols[key].type=="symbol"){
	//		console.log(key , poiHref);
	//		console.log(key,getImagePath(symbols[key].path,poiDocId));
			ihtml+='<img id="symbol'+key+'" src="' + symbols[key].path + '" width="' + symbols[key].width + '" height="' + symbols[key].height + '" property="' + key + '" ';
			if ( firstSymbol ){
				ihtml += 'border="2" style="border-color:red" ';
				firstSymbol = false;
			} else {
				ihtml += 'border="2" style="border-color:white" ';
			}
			ihtml+='/>';
		}
	}
	ihtml += '</td></tr>';
	
	ihtml += '<tr><td>title</td><td><input type="text" id="poiEditorTitle" value="' + "title" + '"/></td></tr>';
	ihtml += '<tr><td><input type="button" id="pointUI" value="lat/lng"/></td><td><input id="poiEditorPosition" type="text" value="--,--"/></td></tr></table>'
	
	
	ihtml += '<table id="metaEditor">';
	var latMetaCol,lngMetaCol,titleMetaCol; // 位置とtitleがメタデータにも用意されている（ダブっている）ときに、それらのカラム番号が設定される。
	for ( var i = 0 ; i < metaSchema.length ; i++ ){
		var mdval ="";
		if ( metaSchema[i] == "title"){
			titleMetaCol =i;
			ihtml+='<tr><td>' + metaSchema[i] + '</td><td><input id="meta'+i+'" type="text" disabled="disabled" value="'+"title"+'"/></td></tr>';
		} else if ( metaSchema[i] == "latitude" || metaSchema[i] == "lat" || metaSchema[i] == "緯度"){
			latMetaCol = i;
			ihtml+='<tr><td>' + metaSchema[i] + '</td><td><input id="meta'+i+'" type="text" disabled="disabled" value="' + "numberFormat(latlng.lat )" + '"/></td></tr>';
		} else if ( metaSchema[i] == "longitude"|| metaSchema[i] == "lon" || metaSchema[i] == "lng" || metaSchema[i] == "経度"){
			lngMetaCol = i;
			ihtml+='<tr><td>' + metaSchema[i] + '</td><td><input id="meta'+i+'" type="text" disabled="disabled" value="' + "numberFormat(latlng.lng )" + '"/></td></tr>';
			
		} else {
			ihtml+='<tr><td>' + metaSchema[i] + '</td><td><input id="meta'+i+'" type="text" value="' + mdval + '"/></td></tr>';
		}
	}
	ihtml+='</table><div id="editConf"><input type="button" id="pepok" value="決定"/><input type="button" id="pepng" value="キャンセル"/><input type="button" id="pepdel" disabled value="削除"/><span id="editMode">newObject</span></div>';
	targetDiv.innerHTML = ihtml;
	
//	addPoiEditEvents(document.getElementById(poiDocId));
	
	uiMapping = {
		uiPanel : targetDiv,
		editingDocId : poiDocId,
		editingMode : "POI",
		uiDoc: uiDoc,
		editingGraphicsElement: false,
		modifyTargetElement: null
	} ;
	
	setPoiUiEvents(uiDoc, poiDocId);
	setMetaUiEvents(uiDoc, poiDocId);
	setEditConfEvents(uiDoc, poiDocId);
	
}

function setMetaUiEvents(targetDoc){
	targetDoc.getElementById("metaEditor").addEventListener("click",function(e){
		console.log( getMetaUiData(targetDoc));
		switch ( e.target.id ){
		}
	},false);
}

function getMetaUiData(targetDoc){
	var metaAns = [];
	var tbl = targetDoc.getElementById("metaEditor");
	for ( var i = 0 ; i < tbl.rows.length ; i++ ){
//		console.log(tbl.rows[i].cells[1]);
		metaAns.push(tbl.rows[i].cells[1].childNodes[0].value);
	}
	return ( metaAns );
}

function setEditConfEvents( targetDoc , poiDocId){
	pointAddMode = false;
	targetDoc.getElementById("editConf").addEventListener("click",function(e){
		console.log("editConf event : id:",e.target.id, " editMode:",uiMapping);
		
		if ( uiMapping.editingMode ==="POLYLINE" || uiMapping.editingMode ==="POLYGON"){
			removePointEvents( editPolyPoint );
		}
		var confStat;
		switch ( e.target.id ){
		case"pepok": // 値設定決定用
			confStat = "OK";
			if ( uiMapping.editingMode ==="POI"){
//				clearPoiSelection();
				var ret = setPoiSvg(targetDoc,poiDocId);
				// 既存アイコンを選択しているものがあれば元に戻す
				if ( uiMapping.modifyTargetElement && document.getElementById(uiMapping.modifyTargetElement.getAttribute("iid"))){
					document.getElementById(uiMapping.modifyTargetElement.getAttribute("iid")).style.backgroundColor="";
					if ( ret ){
						document.getElementById(uiMapping.modifyTargetElement.getAttribute("iid")).title =ret.getAttribute("xlink:title");
					}
				}
			} else if ( uiMapping.editingMode ==="POLYLINE" || uiMapping.editingMode ==="POLYGON"){
				setPolySvg(targetDoc,poiDocId);
			}
			uiMapping.modifyTargetElement=null;
			uiMapping.editingGraphicsElement=false;
			break;
				
		case"pepng": // キャンセル用
			confStat = "Cancel";
			console.log("do cancel",uiMapping.editingMode);
			uiMapping.modifyTargetElement=null;
			uiMapping.editingGraphicsElement = false;
//			if ( uiMapping.editingMode ==="POI"){
//			} else if ( uiMapping.editingMode ==="POLYLINE"){
//				polyCanvas.removeCanvas();
//			}
			break;
		case"pepdel": // 削除
			confStat = "Delete";
			uiMapping.editingGraphicsElement = false;
			var svgElem = uiMapping.modifyTargetElement;
			svgElem.parentNode.removeChild(svgElem);
			uiMapping.modifyTargetElement=null;
			break;
		}
		uiMapping.selectedPointsIndex = -1;
		uiMapping.insertPointsIndex = -1;
		clearForms(targetDoc);
		poiCursor.removeCursor();
		polyCanvas.removeCanvas();
		svgMap.refreshScreen();
//		console.log("toolsCbFunc?:",toolsCbFunc);
		if ( toolsCbFunc ){
			toolsCbFunc(confStat, toolsCbFuncParam);
		}
	},false);
}

function clearForms(targetDoc){
	console.log("clearForms");
	if ( uiMapping.modifyTargetElement && uiMapping.modifyTargetElement.getAttribute("iid")){
		document.getElementById(uiMapping.modifyTargetElement.getAttribute("iid")).style.backgroundColor="";
		uiMapping.modifyTargetElement = null;
	}
	targetDoc.getElementById("pepdel").disabled=true;
	targetDoc.getElementById("editMode").innerHTML="newObject";
	if ( uiMapping.editingMode ==="POI"){
		var tbl = targetDoc.getElementById("poiEditor");
		var symbs = tbl.rows[0].cells[0].childNodes;
		for ( var i = 0 ; i < symbs.length ; i++ ){
			if ( i==0 ){
				symbs[i].style.borderColor = "red";
			} else {
				symbs[i].style.borderColor = "white";
			}
		}
		tbl.rows[1].cells[1].childNodes[0].value="";
		tbl.rows[2].cells[1].childNodes[0].value="--,--";
	} else if ( uiMapping.editingMode ==="POLYLINE" || uiMapping.editingMode ==="POLYGON"){
		var tbl = targetDoc.getElementById("polyEditorPosition");
		removeChildren(tbl);
		tbl.innerHTML='<tr><td><input type="button" id="pointAdd" value="ADD"/></td></tr>';
	}
	
	var tbl = targetDoc.getElementById("metaEditor");
	for ( var i = 0 ; i < tbl.rows.length ; i++ ){
//		console.log(tbl.rows[i].cells[1]);
		tbl.rows[i].cells[1].childNodes[0].value="";
	}
	
}

function setPoiSvg(targetDoc,poiDocId){
	console.log(targetDoc,poiDocId,targetDoc.documentElement);
	var targetId;
	if ( uiMapping.modifyTargetElement ){
		targetId = uiMapping.modifyTargetElement.getAttribute("iid");
	}
	var poiElem;
	var poiDoc = svgImages[poiDocId];
	if ( targetId ){
		poiElem = svgMap.getElementByImageId(poiDoc,targetId); // getElementByIdじゃないのよね・・・
		if (!poiElem){ // edit existing POI
			poiElem = poiDoc.createElement("use");
		}
	} else {
		poiElem = poiDoc.createElement("use");
//		nextsibling.....? なんか無造作すぎる気もする・・・
		poiDoc.documentElement.appendChild(poiElem);
	}
	
	var param = readPoiUiParams(targetDoc);
	console.log("setPoiSvg:",param);
	
	if ( param.geoPos[0] && param.href ){
		var svgPoint = svgMap.Geo2SVG( param.geoPos[0] , param.geoPos[1] , svgImagesProps[poiDocId].CRS);
		
		metaStr = "";
		for ( var i = 0 ; i < param.metadata.length ; i++ ){
			metaStr += svgMap.escape(param.metadata[i]);
			if ( i == param.metadata.length -1 ){
				break;
			}
			metaStr += ",";
		}
		
		poiElem.setAttribute("content",metaStr);
		poiElem.setAttribute("xlink:title",param.title);
		poiElem.setAttribute("transform" , "ref(svg,"+svgPoint.x + ","+svgPoint.y+")");
		poiElem.setAttribute("xlink:href", param.href);
		console.log("setPoiSvg:",poiElem);
		return ( poiElem );
	} else {
		// ERROR
		return ( false );
	}
	
}

function setPolySvg(targetDoc,poiDocId){
	console.log("setPolySvg:",targetDoc,poiDocId);
	var targetSvgElem = null;
	var geoPoints = polyCanvas.getPoints();
	if ( geoPoints.length < 2 || (uiMapping.editingMode == "POLYGON" && geoPoints.length < 3) ){
		return ( false );
	}
	
	if (  uiMapping.modifyTargetElement &&  ( uiMapping.modifyTargetElement.nodeName == "polygon" || uiMapping.modifyTargetElement.nodeName == "polyline" ) ){
		// 編集対象が既存オブジェクトであり、polygon,pathの場合
		targetSvgElem = uiMapping.modifyTargetElement;
		var d="";
		for ( var i = 0 ; i < geoPoints.length ; i++ ){
			var svgPoint = svgMap.Geo2SVG( geoPoints[i].lat , geoPoints[i].lng , svgImagesProps[poiDocId].CRS);
			d+=svgPoint.x+","+svgPoint.y+" ";
		}
		targetSvgElem.setAttribute("points",d);
	} else {
		// 編集対象が新規もしくは既存pathオブジェクトの場合
		if ( uiMapping.modifyTargetElement){
			targetSvgElem = uiMapping.modifyTargetElement;
		} else {
			var poiDoc = svgImages[poiDocId];
			targetSvgElem = poiDoc.createElement("path");
			targetSvgElem.setAttribute("vector-effect","non-scaling-stroke");
			targetSvgElem.setAttribute("fill","yellow");
			targetSvgElem.setAttribute("stroke","red");
			targetSvgElem.setAttribute("stroke-width","3");
			poiDoc.documentElement.appendChild(targetSvgElem);
		}
		var d="";
		for ( var i = 0 ; i < geoPoints.length ; i++ ){
			var svgPoint = svgMap.Geo2SVG( geoPoints[i].lat , geoPoints[i].lng , svgImagesProps[poiDocId].CRS);
			if ( i == 0 ){
				d="M"+svgPoint.x+","+svgPoint.y+"L";
			} else {
				d+=svgPoint.x+","+svgPoint.y+" ";
			}
		}
		if ( uiMapping.editingMode == "POLYGON"){
			d+="z";
		} else {
		}
		targetSvgElem.setAttribute("d",d);
		
		var meta = getMetaUiData(targetDoc);
		metaStr = "";
		for ( var i = 0 ; i < meta.length ; i++ ){
			metaStr += svgMap.escape(meta[i]);
			if ( i == meta.length -1 ){
				break;
			}
			metaStr += ",";
		}
		targetSvgElem.setAttribute("content",metaStr);
	}
}


function readPoiUiParams(targetDoc){
	var meta = getMetaUiData(targetDoc);
	var tbl = targetDoc.getElementById("poiEditor");
	var symbs = tbl.rows[0].cells[0].childNodes;
	console.log(symbs);
	var symbolHref;
	for ( var i = 0 ; i < symbs.length ; i++ ){
		if ( symbs[i].style.borderColor === "red" ){
			symbolHref = symbs[i].getAttribute("property");
			break;
		}
	}
	var title = tbl.rows[1].cells[1].childNodes[0].value;
	var geoPos = tbl.rows[2].cells[1].childNodes[0].value.split(",");
	console.log(geoPos);
	geoPos[0]=Number(geoPos[0]);
	geoPos[1]=Number(geoPos[1]);
	return {
		title: title,
		geoPos : geoPos,
		metadata : meta,
		href : symbolHref
	}
}

function setPoiPosition(e){
	var mxy = svgMap.getMouseXY(e);
	var geop = svgMap.screen2Geo(mxy.x , mxy.y );
	poiCursor.setCursorGeo(geop);
//	cursor.style.left = (screenPoint.x - 6) + "px";
//	cursor.style.top = (screenPoint.y - 6)+ "px";
	console.log("XY:",mxy, " latlng:",geop, " form:",targetDoc.getElementById("poiEditorPosition"));
//	values[2].value= numberFormat(geop.lat) + "," + numberFormat(geop.lng);
	targetDoc.getElementById("poiEditorPosition").value= svgMap.numberFormat(geop.lat) + "," + svgMap.numberFormat(geop.lng);
	document.removeEventListener("click", setPoiPosition, false);
}

function setPoiUiEvents( targetDoc){
	targetDoc.getElementById("poiEditor").addEventListener("click",function(e){
		console.log("PoiUiEvent: targetId:",e.target.id);
		switch ( e.target.id ){
		case"pointUI": // 緯度経度のカーソル入力用
			console.log("pointUIev");
			setTimeout(function(){
				document.addEventListener("click", setPoiPosition , false );
			},100);
			break;
		}
		if ( e.target.parentNode.id =="iconselection"){
			for ( var i = 0 ; i < e.target.parentNode.childNodes.length ; i++ ){
				e.target.parentNode.childNodes[i].setAttribute("style","border-color:white");
			}
			e.target.setAttribute("style","border-color:red");
			var selectedPoiHref = e.target.getAttribute("property");
			console.log("selPoi:",selectedPoiHref);
		}
	},false);
}

// Polygon,Polyline,Path用のキャンバスのクロージャ
var polyCanvas = (function(){
	var enabled = false;
	
	var cv; // canvas elem
	var cc; // context of canvas
	var cs; // canvasSize
	var geoPoints=[]; // draw points
	
	var defaultFillColor = "rgba(255,127,0,1.0)";
	var defaultStrokeColor = "rgba(255,0,0,1.0)";
	var defaultLineWidth = 3.0;
	
	function initCanvas(){
		enabled = true;
//		console.log("initCanvas");
		if (  document.getElementById("PolyEditCanvas") ){
			cv = document.getElementById("PolyEditCanvas");
		} else {
			cv = document.createElement("canvas");
			cs = svgMap.getMapCanvasSize();
			cv.width = cs.width;
			cv.height = cs.height;
			cv.id="PolyEditCanvas";
			cv.style.position="absolute";
			cv.style.left="0px";
			cv.style.top="0px";
			cv.style.zIndex="20";
//			cv.style.width=cs.width+"px";
//			cv.style.height=cs.height+"px";
			var mapc=document.getElementById("mapcanvas");
//			document.getElementById("centerSight").parentNode.appendChild(cv);
			mapc.appendChild(cv);
		}
		cc = cv.getContext("2d");
		cc.globalAlpha = 0.5;
		cc.lineWidth = defaultLineWidth;
		cc.strokeStyle = defaultStrokeColor;
		cc.fillStyle = defaultFillColor;
//		cc.clearRect(0, 0, cv.width, cv.height);
//		cc.beginPath();
//		cc.fillRect(400,300,500,500);
//		cc.stroke();
//		cc.beginPath();
//		cc.moveTo(0, 0);
//		cc.lineTo(200, 100);
//		cc.lineTo(100, 100);
//		cc.closePath();
//		cc.stroke();
		document.addEventListener("screenRefreshed",updateCanvas);
	}
	
	function addPoint(point){
		geoPoints.push(point);
//		console.log("addPoint:",point,geoPoints);
		updateCanvas();
	}
	
	function setPoints(points){
		if ( points[0].lat ){
			geoPoints = points;
		} else {	
			geoPoints=[];
			for ( var i = 0 ; i < points.length ; i++ ){
				geoPoints.push({lat:points[i][0],lng:points[i][1]});
			}
		}
		updateCanvas();
	}
	
	function getPoints(){
		return ( geoPoints );
	}
	
	function updateCanvas(){
		console.log("updateCanvas");
		initCanvas();
		cc.clearRect(0, 0, cs.width, cs.height);
		cc.beginPath();
		for ( var i = 0 ; i < geoPoints.length ; i++ ){
			var screenPoint = svgMap.geo2Screen( geoPoints[i].lat , geoPoints[i].lng );
//			console.log(screenPoint);
			if ( i==0 ){
				cc.moveTo(screenPoint.x, screenPoint.y);
			} else {
				cc.lineTo(screenPoint.x, screenPoint.y);
			}
		}
//		cc.closePath();
		cc.stroke();
		
		if ( uiMapping.insertPointsIndex >=0 ){
			hilightLine(uiMapping.insertPointsIndex);
		} else if ( uiMapping.selectedPointsIndex >=0 ){
			hilightPoint(uiMapping.selectedPointsIndex);
		}
		
		
	}
	
	function clearPoints(){
		geoPoints = [];
	}
	
	function hilightPoint( index ){
		if ( index >=0 && index < geoPoints.length ){
			var P1 = svgMap.geo2Screen(geoPoints[index].lat , geoPoints[index].lng);
		console.log("hilightPoint:",index," XY:",P1);
//			updateCanvas();
			cc.lineWidth = defaultLineWidth * 2;
			cc.strokeStyle = "rgba(0,255,0,1.0)";
			cc.fillStyle = "rgba(0,255,0,1.0)";
			
			cc.beginPath();
			cc.arc(P1.x, P1.y , defaultLineWidth * 2 , 0 , Math.PI*2, true);
			cc.fill();
			cc.stroke();
			
			cc.lineWidth = defaultLineWidth;
			cc.strokeStyle = defaultStrokeColor;
			cc.fillStyle = defaultFillColor;
		}
	}
	
	function hilightLine( index ){
		console.log("polyCanvas hilightLine:",index, " totalPoints:",geoPoints.length);
		var P1,P2;
		if ( index >0 && index < geoPoints.length ){
			P1 = svgMap.geo2Screen(geoPoints[index-1].lat , geoPoints[index-1].lng);
			P2 = svgMap.geo2Screen(geoPoints[index].lat , geoPoints[index].lng);
		} else if ( index == 0 || index == geoPoints.length ){
			P1 = svgMap.geo2Screen(geoPoints[geoPoints.length-1].lat , geoPoints[geoPoints.length-1].lng);
			P2 = svgMap.geo2Screen(geoPoints[0].lat , geoPoints[0].lng);
		}
		if ( P1 ){
//			updateCanvas();
			cc.lineWidth = defaultLineWidth * 2;
			cc.strokeStyle = "rgba(0,255,0,1.0)";
//			cc.strokeStyle = "rgba(255,255,0,1.0)";
			cc.beginPath();
			cc.moveTo(P1.x, P1.y);
			cc.lineTo(P2.x, P2.y);
			cc.closePath();
//			cc.fill();
			cc.stroke();
			
			cc.lineWidth = defaultLineWidth;
			cc.strokeStyle = defaultStrokeColor;
			cc.fillStyle = defaultFillColor;
		}
	}
	
	function removeCanvas(){
		enabled = false;
		clearPoints();
		console.log("removeCanvas");
		document.removeEventListener("screenRefreshed", updateCanvas, false);
		if ( document.getElementById("PolyEditCanvas") ){
			var cv = document.getElementById("PolyEditCanvas");
			cv.parentNode.removeChild(cv);
		}
	}
	
	return{
//		initCanvas: initCanvas,
		clearPoints: clearPoints,
		addPoint: addPoint,
		setPoints: setPoints,
		getPoints: getPoints,
		removeCanvas: removeCanvas,
		updateCanvas: updateCanvas,
//		hilightLine: hilightLine,
//		hilightPoint: hilightPoint
	}
})();

	
// POI用グラフィックスカーソルのクロージャ
// 今のところ一個のみ
var poiCursor = (function (){
	var enabled = false;
	var cursorGeoPoint;
	
	function setCursorGeo(geoPoint){
		cursorGeoPoint = geoPoint;
		enabled = true;
		updateCursorGeo();
		document.addEventListener("screenRefreshed",updateCursorGeo);
	}
	
	function updateCursorGeo(){
		console.log("updateCursor:",cursorGeoPoint);
		if ( document.getElementById("centerSight") ){
			var screenPoint = svgMap.geo2Screen( cursorGeoPoint.lat , cursorGeoPoint.lng );
			if ( ! document.getElementById("POIeditCursor") ){
				cursor = document.createElement("img");
		//		poiの画面上の位置を得る
				cursor.style.position = "absolute";
				cursor.style.width="10";
				cursor.style.height="10";
				cursor.id = "POIeditCursor";
				var cs = document.getElementById("centerSight");
				cursor.src = cs.src;
	//			cs.parentNode.appendChild(cursor);
				var mapc=document.getElementById("mapcanvas");
				mapc.appendChild(cursor);
			} else {
				cursor = document.getElementById("POIeditCursor");
			}
			cursor.style.left = (screenPoint.x - 6) + "px";
			cursor.style.top = (screenPoint.y - 6)+ "px";
		}
	}
	
	function removeCursor(){
		enabled = false;
		console.log("removeCursor");
		document.removeEventListener("screenRefreshed", updateCursorGeo, false);
		if ( document.getElementById("POIeditCursor") ){
			var cursor = document.getElementById("POIeditCursor");
			cursor.parentNode.removeChild(cursor);
		}
	}
	return {
		setCursorGeo: setCursorGeo,
		removeCursor:removeCursor
	};
})();



function addPoiEditEvents( targetCanvasNode ){ // 不使用
	var cn = targetCanvasNode.childNodes;
	for ( var i = 0 ; i < cn.length ; i++ ){
		if ( cn[i].nodeName==="img" ){
			addEventListener("click",function(e){
				cdonsole.log("click:",e);
			});
		} else if ( cn[i].nodeName==="div" ){
			addPoiEditEvents(cn[i]);
		}
	}
}

function getPOIprops( svgTarget ){
	var poiNode = svgTarget.element;
	var poiDocId = svgTarget.docId
	
	var svgPos = svgMap.getPoiPos(poiNode);
	var poiHref = poiNode.getAttribute("xlink:href");
//	var metaSchema = poiNode.parentNode.getAttribute("property").split(",");
	var metaData = poiNode.getAttribute("content").split(",");
	var title = poiNode.getAttribute("xlink:title");
	var latlng = svgMap.SVG2Geo(Number(svgPos.x) , Number(svgPos.y) , svgImagesProps[poiDocId].CRS);
	return {
		position : latlng,
		href : poiHref,
		metaData : metaData,
		title : title
	}
}

function getPolyProps( svgTarget ){
	console.log("getPolyProps:",svgTarget,svgTarget.element.nodeName);
	var poiNode = svgTarget.element;
	var poiDocId = svgTarget.docId
	
//	var svgPos = svgMap.getPoiPos(poiNode);
//	var poiHref = poiNode.getAttribute("xlink:href");
//	var metaSchema = poiNode.parentNode.getAttribute("property").split(",");
	var metaData;
	if ( poiNode.getAttribute("content") ){
		metaData = poiNode.getAttribute("content").split(",");
	}
//	var title = poiNode.getAttribute("xlink:title");
//	var latlng = svgMap.SVG2Geo(Number(svgPos.x) , Number(svgPos.y) , svgImagesProps[poiDocId].CRS);
	
	var geops;
	if (svgTarget.element.nodeName == "path"){
		var svgps = getPolyPoints(pathConditioner(svgTarget.element.getAttribute("d")));
//		console.log(svgps);
		geops = getGeoCoordinates(svgps,svgImagesProps[poiDocId].CRS);
//		console.log(geops);
		
	} else if (svgTarget.element.nodeName == "polygon"|| svgTarget.element.nodeName == "polyline"){
		// TBD
	}
	return {
		position : geops,
//		href : poiHref,
		metaData : metaData,
//		title : title
	}
}

// 以下の pathのためのパーサは本体に既に存在しており、重複しているのが好ましくない。2016.12.28
function pathConditioner( d ){
	d = d.replace(/,/gm,' '); // get rid of all commas
	d = d.replace(/([MmZzLlHhVvCcSsQqTtAa])([MmZzLlHhVvCcSsQqTtAa])/gm,'$1 $2'); // separate commands from commands
	d = d.replace(/([MmZzLlHhVvCcSsQqTtAa])([MmZzLlHhVvCcSsQqTtAa])/gm,'$1 $2'); // separate commands from commands
	d = d.replace(/([MmZzLlHhVvCcSsQqTtAa])([^\s])/gm,'$1 $2'); // separate commands from points
	d = d.replace(/([^\s])([MmZzLlHhVvCcSsQqTtAa])/gm,'$1 $2'); // separate commands from points
	d = d.replace(/([0-9])([+\-])/gm,'$1 $2'); // separate digits when no comma
	d = d.replace(/(\.[0-9]*)(\.)/gm,'$1 $2'); // separate digits when no comma
	d = d.replace(/([Aa](\s+[0-9]+){3})\s+([01])\s*([01])/gm,'$1 $3 $4 '); // shorthand elliptical arc path syntax
	d = trim(compressSpaces(d)).split(' '); // compress multiple spaces
//	console.log("d:",d);
	return ( d );
}
function compressSpaces(s) { return s.replace(/[\s\r\t\n]+/gm,' '); }
function trim(s) { return s.replace(/^\s+|\s+$/g, ''); }
function getPolyPoints(d){
	var svgXY = [];
	var prevCommand="M";
	var prevCont = false;
	var sx = 0, sy = 0;
	var startX = 0, startY = 0; // mx,myと似たようなものだがtransformかけてない・・・ 2016/12/1 debug
	var i = 0;
	var command = d[i];
	var closed = false;
	
	var hitPoint = new Object(); // pathのhitPoint(線のためのhitTestエリア)を追加してみる(2013/11/28)
	while ( i < d.length ){
		switch (command){
		case "M":
			++i;
			sx = Number(d[i]);
			++i;
			sy = Number(d[i]);
			startX = sx;
			startY = sy;
			var svgP = [sx,sy];
			var svgPs = [svgP];
			svgXY.push( svgPs );
			command ="L"; // 次のコマンドが省略されたときのバグ対策 2016.12.5
			break;
		case "m":
			++i;
			sx += Number(d[i]);
			++i;
			sy += Number(d[i]);
			startX = sx;
			startY = sy;
			var svgP = [sx,sy];
			var svgPs = [svgP];
			svgXY.push( svgPs );
			command ="l"; // 次のコマンドが省略されたときのバグ対策 2016.12.5
			break;
		case "L":
			++i;
			sx = Number(d[i]);
			++i;
			sy = Number(d[i]);
			var svgP = [sx,sy];
			var thisPs = svgXY[svgXY.length -1 ]
			thisPs.push(svgP);
			break;
		case "l":
			++i;
			sx += Number(d[i]);
			++i;
			sy += Number(d[i]);
			var svgP = [sx,sy];
			var thisPs = svgXY[svgXY.length -1 ]
			thisPs.push(svgP);
			break;
		case "A":
			// skip
			++i;
			++i;
			++i;
			++i;
			++i;
			++i;
			++i;
			break;
		case "Z":
		case "z":
			closed = true;
			sx = startX; // debug 2016.12.1
			sy = startY;
			var svgP = [sx,sy];
			var thisPs = svgXY[svgXY.length -1 ]
			thisPs.push(svgP);
			svgXY.type = "POLYGON";
			break;
		default:
			prevCont = true;
			break;
		}
		
		
		if ( !prevCont ){
			prevCommand = command;
			++i;
			command = d[i];
		} else {
			command = prevCommand;
			prevCont = false;
			--i;
		}
		
	}
	return ( svgXY );
}
function getGeoCoordinates(svgXY , CRS){
	var latlng;
	var geoXY = [];
	var subGeoXY;
	for ( var i = 0 ; i < svgXY.length ; i++ ){
		if ( svgXY[0] instanceof Array ){
			subGeoXY = [];
			for ( var j = 0 ; j < svgXY[i].length ; j++ ){
				latlng = svgMap.SVG2Geo(svgXY[i][j][0],svgXY[i][j][1],CRS);
				subGeoXY.push([latlng.lat,latlng.lng]);
			}
			geoXY.push(subGeoXY);
		} else {
			latlng = svgMap.SVG2Geo(svgXY[i][0],svgXY[i][1],CRS);
			geoXY.push([latlng.lat,latlng.lng]);
		}
	}
	if ( svgXY.type ){
		geoXY.type = svgXY.type;
	}
	return(geoXY);
}





function setTargetObject(svgTarget){
	console.log("called setTargetObject:",svgTarget);
	console.log( uiMapping.editingDocId , svgTarget.docId, svgTarget);
	
	if ( uiMapping.editingDocId === svgTarget.docId ){ // 冗長・・
		var svgNode = svgTarget.element;
//		var targetDocId = svgTarget.docId
		console.log("setTargetObject:",svgNode);
		if ( svgNode.nodeName =="use"){
			hilightPOI(svgNode.getAttribute("iid"));
			displayPOIprops(svgTarget);
		} else if ( svgNode.nodeName =="path" || svgNode.nodeName =="polygon" || svgNode.nodeName =="polyline" ){
			displayPolyProps(svgTarget);
		}
	}
}

var selectedObjectID; // これは、メイン画面上の選択されたオブジェクト(アイコン)のIDなのでたぶんグローバルで問題ないはずです。
function hilightPOI( poiID ){
	console.log("hilightPOI  :  targetPOI ID:",poiID);
	document.getElementById(poiID).style.backgroundColor="#FFFF00";
	if ( selectedObjectID && (selectedObjectID != poiID ) && document.getElementById(selectedObjectID) ){
		document.getElementById(selectedObjectID).style.backgroundColor="";
	}
	selectedObjectID = poiID;
}





function displayPOIprops(svgTarget){
	// 選択されたPOIに対する属性を編集パネルに書き込む。
	var props = getPOIprops(svgTarget);
//	console.log(props);
	var targetDiv = uiMapping.uiPanel;
//	console.log(targetDiv, targetDiv.ownerDocument);
	var uiDoc = targetDiv.ownerDocument;
	var de = uiDoc.documentElement;
	uiMapping.modifyTargetElement = svgTarget.element;
	
	uiDoc.getElementById("pepdel").disabled=false;
	uiDoc.getElementById("editMode").innerHTML="modifyObject";
	var me = uiDoc.getElementById("metaEditor");
	var pep = uiDoc.getElementById("poiEditorPosition");
	pep.value=svgMap.numberFormat(props.position.lat) + "," + svgMap.numberFormat(props.position.lng);
	uiDoc.getElementById("poiEditorTitle").value = props.title;
	for ( var i = 0 ; i < props.metaData.length ; i++ ){
//		console.log(props.metaData[i],me.rows[i].cells[1]);
		uiDoc.getElementById("meta"+i).value = props.metaData[i];
	}
	var smbls =  uiDoc.getElementById("iconselection").childNodes;
	for ( var i = 0 ; i < smbls.length ; i++ ){
		smbls[i].style.borderColor="white";
	}
	uiDoc.getElementById("symbol"+props.href).style.borderColor="red";
	
	var screenPoint = svgMap.geo2Screen( props.position.lat , props.position.lng );
	poiCursor.setCursorGeo(props.position);
}

function displayPolyProps(svgTarget){
	var props = getPolyProps(svgTarget);
	var targetDiv = uiMapping.uiPanel;
	var uiDoc = targetDiv.ownerDocument;
	var de = uiDoc.documentElement;
	uiMapping.modifyTargetElement = svgTarget.element;
	
	uiDoc.getElementById("pepdel").disabled=false;
	uiDoc.getElementById("editMode").innerHTML="modifyObject";
	
	var me = uiDoc.getElementById("metaEditor");
	var pep = uiDoc.getElementById("polyEditorPosition");
	console.log(props.position);
	if ( props.position.type &&  props.position.type==="POLYGON"){
		// geojsonとちがい最終点は閉じないことにする
		uiMapping.editingMode ="POLYGON";
		var pointsLength = props.position[0].length-1;
	} else {
		uiMapping.editingMode ="POLYLINE";
		var pointsLength = props.position[0].length;
	}
	
	var points = [];
	for ( var i = 0 ; i < pointsLength ; i++ ){
		points.push({lat:props.position[0][i][0],lng:props.position[0][i][1]});
	}
	
	updatePointListForm(pep, points);
	
	console.log("points:",points);
	polyCanvas.setPoints(points);
	
	
	
//	uiMapping.insertPointsIndex = points.length;
	polyCanvas.updateCanvas();
	if ( props.metaData && props.metaData.length){
		for ( var i = 0 ; i < props.metaData.length ; i++ ){
	//		console.log(props.metaData[i],me.rows[i].cells[1]);
			uiDoc.getElementById("meta"+i).value = props.metaData[i];
		}
	}
}

function updatePointListForm(pep, points){
	var taVal = "";
	
	for ( var i = 0 ; i < points.length ; i++ ){
		taVal += '<tr><td><input type="button" id="pointIns' + i + '" value="INS"/></td><td><input id="point' + i + '" style="width:200px" type="button" value="' + svgMap.numberFormat(points[i].lat) + ', ' + svgMap.numberFormat(points[i].lng) + '"/></td></tr>';
	}
	
	taVal +='<tr><td><input type="button" id="pointAdd" value="ADD"/></td></tr>';
	pep.innerHTML=taVal;
}

var toolsCbFunc;
var toolsCbFuncParam
function initPolygonTools(targetDiv,poiDocId,cbFunc,cbFuncParam){
	if ( cbFunc ){
		toolsCbFunc = cbFunc;
		toolsCbFuncParam = cbFuncParam;
	} else {
		toolsCbFunc = null;
		toolsCbFuncParam = null;
	}
	
//	console.log("initPolygonTools");
	
	removeChildren( targetDiv );
	
	var uiDoc = targetDiv.ownerDocument;
	uiDoc.removeEventListener("hideFrame", clearTools, false);
	uiDoc.removeEventListener("closeFrame", clearTools, false);
	uiDoc.removeEventListener("closeFrame", setTools, false);
	uiDoc.addEventListener('hideFrame',clearTools);
	uiDoc.addEventListener('closeFrame',clearTools);
	uiDoc.addEventListener('appearFrame',setTools);
	
	console.log("called initPolygonTools: docId:",poiDocId);
	var isRootLayer = svgMap.setRootLayersProps(poiDocId, true , true ); // 子docの場合もあり得ると思う・・
		if ( ! isRootLayer ){ // 実質なにも今のところしていないがアラートはメッセージする(2017.1.20)
		console.log("This ID is not layer (child document of layer).. thus you can only add new elements ( not edit existing element) ");
	}
	
	svgImages = svgMap.getSvgImages();
	svgImagesProps = svgMap.getSvgImagesProps();
	var symbols = svgMap.getSymbols(svgImages[poiDocId]);
	var metaSchema = null;
	if ( svgImages[poiDocId].documentElement.getAttribute("property") && svgImages[poiDocId].documentElement.getAttribute("property").length>0 ){
		metaSchema = svgImages[poiDocId].documentElement.getAttribute("property").split(",");
	}
	var ihtml = '<div id="polyEditor" style="width:300px;height:100px;overflow:auto"><table id="polyEditorPosition"><tr><td><input type="button" id="pointAdd" value="ADD"/></td></tr></table></div>';
	
	
	console.log(" init metaEditor table... metaSchema:",metaSchema );
	
	ihtml += '<table id="metaEditor">';
	var latMetaCol,lngMetaCol,titleMetaCol; // 位置とtitleがメタデータにも用意されている（ダブっている）ときに、それらのカラム番号が設定される。
	if ( metaSchema ){
		for ( var i = 0 ; i < metaSchema.length ; i++ ){
			var mdval ="";
			if ( metaSchema[i] == "title"){
				titleMetaCol =i;
				ihtml+='<tr><td>' + metaSchema[i] + '</td><td><input id="meta'+i+'" type="text" disabled="disabled" value="'+"title"+'"/></td></tr>';
			} else if ( metaSchema[i] == "latitude" || metaSchema[i] == "lat" || metaSchema[i] == "緯度"){
				latMetaCol = i;
				ihtml+='<tr><td>' + metaSchema[i] + '</td><td><input id="meta'+i+'" type="text" disabled="disabled" value="' + "numberFormat(latlng.lat )" + '"/></td></tr>';
			} else if ( metaSchema[i] == "longitude"|| metaSchema[i] == "lon" || metaSchema[i] == "lng" || metaSchema[i] == "経度"){
				lngMetaCol = i;
				ihtml+='<tr><td>' + metaSchema[i] + '</td><td><input id="meta'+i+'" type="text" disabled="disabled" value="' + "numberFormat(latlng.lng )" + '"/></td></tr>';
				
			} else {
				ihtml+='<tr><td>' + metaSchema[i] + '</td><td><input id="meta'+i+'" type="text" value="' + mdval + '"/></td></tr>';
			}
		}
	}
	ihtml+='</table><div id="editConf"><input type="button" id="pepok" value="決定"/><input type="button" id="pepng" value="キャンセル"/><input type="button" id="pepdel" disabled value="削除"/><span id="editMode">newObject</span></div>';
	targetDiv.innerHTML = ihtml;
	
	uiMapping = {
		uiPanel : targetDiv,
		editingDocId : poiDocId,
//		editingMode : "POLYLINE",
		editingMode : "POLYGON",
		uiDoc: uiDoc,
		editingGraphicsElement: false,
		modifyTargetElement: null,
		selectedPointsIndex : -1,
		insertPointsIndex : -1

	};
//	polyCanvas.initCanvas();
	setPolyUiEvents(uiDoc, poiDocId);
	setMetaUiEvents(uiDoc, poiDocId);
	setEditConfEvents(uiDoc, poiDocId);
}

function testTouch(e){
	console.log("testTouch:",e, e.changedTouches[0]);
	console.log( e.changedTouches[0].pageX, e.changedTouches[0].pageY );
}

var prevMouseXY={x:0,y:0};
var pointAddMode = false;

function editPolyPoint(e){
	var mxy = svgMap.getMouseXY(e);
	console.log("editPolyPoint:",mxy);
	if ( prevMouseXY.x == mxy.x && prevMouseXY.y == mxy.y && pointAddMode == false ){
//		document.removeEventListener("click", arguments.callee, false);
		removePointEvents( editPolyPoint );
	}
	prevMouseXY = mxy;
	var geop = svgMap.screen2Geo(mxy.x , mxy.y );
	
	var geoPoints = polyCanvas.getPoints();
	console.log("uiMapping:",uiMapping);
	if ( uiMapping.insertPointsIndex >= 0 && uiMapping.insertPointsIndex < geoPoints.length ){
		// ポイント挿入モード
		console.log( "insert point:",uiMapping.insertPointsIndex);
		var newPoints = [];
		for ( var i = 0 ; i < geoPoints.length ; i++ ){
			if ( i == uiMapping.insertPointsIndex ){
				newPoints.push(geop);
			}
			newPoints.push(geoPoints[i]);
		}
		console.log("insert points::::",newPoints);
		polyCanvas.setPoints(newPoints);
		uiMapping.insertPointsIndex = uiMapping.insertPointsIndex+1;
	} else if ( uiMapping.selectedPointsIndex >= 0 ){
		// ポイント変更モード
		console.log( "replace point:",uiMapping.selectedPointsIndex);
		geoPoints[uiMapping.selectedPointsIndex] = geop;
		polyCanvas.setPoints(geoPoints);
//		document.removeEventListener("click", arguments.callee, false);
//		document.removeEventListener("click", editPolyPoint, false);
		removePointEvents( editPolyPoint );
//		uiMapping.insertPointsIndex = geoPoints.length;
	} else {
		console.log( "add last point:",uiMapping.insertPointsIndex);
		polyCanvas.addPoint(geop);
		uiMapping.insertPointsIndex = geoPoints.length;
	}
	
	geoPoints = polyCanvas.getPoints();
	
	uiMapping.selectedPointsIndex = -1;
//	uiMapping.insertPointsIndex = -1;
//	polyCanvas.hilightLine(uiMapping.insertPointsIndex);
	polyCanvas.updateCanvas();
//*	uiMapping.pointsUiSelectionRange = null;
	
	console.log("updatePointListForm:",geoPoints);
	updatePointListForm( uiMapping.uiDoc.getElementById("polyEditorPosition") , geoPoints );
	
//	document.removeEventListener("click", arguments.callee, false);
	
}

function addPointEvents( func ){
	document.addEventListener( "click", func, false );
	document.addEventListener( "touchend", func, false );
}
function removePointEvents( func ){
	document.removeEventListener( "click", func, false );
	document.removeEventListener( "touchend", func, false );
}

function setPolyUiEvents( targetDoc){
	targetDoc.getElementById("polyEditorPosition").addEventListener("click",function(e){
		console.log("PoiUiEvent: targetId:",e.target.id);
		if (  e.target.id.indexOf("point")==0 ){
			// textareaのカーソル位置変更イベント
			pointAddMode = false;
			
			
			hilightEditingPoint(e.target, targetDoc.getElementById("polyEditorPosition") );
			
			if ( !uiMapping.editingGraphicsElement){
				uiMapping.editingGraphicsElement = true;
//				polyCanvas.initCanvas();
			}
			if ( uiMapping.selectedPointsIndex >=0 || uiMapping.insertPointsIndex >= 0 ){
				console.log ( "FOUCUS SELECTION");
			}
			pointAddMode = true; // これはどうかな・・・
			setTimeout(function(){
				addPointEvents( editPolyPoint );
//				document.addEventListener( "click", editPolyPoint, false );
//				document.addEventListener( "touchend", testTouch, false );
			},30);
			
		} else if (  e.target.id.indexOf("pointAdd")==0 ){
			pointAddMode = true;
		}
	},false);
}

function hilightEditingPoint( targetElem ,srcElem){
	// ボタンIDによって編集対象を洗い出す
	var insertBefore = false;
	var EditPoint;
	if ( targetElem.id.indexOf("pointAdd")==0){
		insertBefore = true;
		console.log(polyCanvas.getPoints().length);
		var pl =  polyCanvas.getPoints().length; 
		if ( pl > 0 ){
			editPoint = pl; 
		}
	} else if ( targetElem.id.indexOf("pointIns")==0){
		insertBefore = true;
		editPoint = Number(targetElem.id.substring(8));
	} else {
		editPoint = Number(targetElem.id.substring(5));
	}
	
	var pointC = 0;
	var selectedIndex = -1;
	var insertIndex = -1;
	
	if ( insertBefore ){
		insertIndex = editPoint;
	} else{
		selectedIndex = editPoint;
	}
	
	console.log("insertIndex:",insertIndex,"  selectedIndex:",selectedIndex);
	
	uiMapping.selectedPointsIndex = selectedIndex;
	uiMapping.insertPointsIndex = insertIndex;
	
	polyCanvas.updateCanvas();
	
}

function getSelectionRange( selectedIndex, insertIndex ,srcStr){
	// hilightEditingPointの逆
	var pointC = 0;
	var varStart = -1;
	if ( insertIndex == 0 ){
		return ( [0 , 0 ] );
	} else if ( selectedIndex == 0 ){
		varStart = 0;
	}
	for ( var i = 0 ; i < srcStr.length ; i++){
		if ( insertIndex > 0){
			if ( i>0 && srcStr.charAt(i-1) == "\n" && insertIndex == pointC ){
				return ( [ i-1 , i-1 ] );
			} else if ( i == srcStr.length -1 ){
				return ( [ i , i ] );
			}
		}
		if (srcStr.charAt(i) == "\n"){
			++ pointC;
		}
		if ( insertIndex < 0 && selectedIndex >=0){
			if ( pointC == selectedIndex ){
				if ( varStart < 0){
					varStart = i +1;
				}
			} else if ( pointC > selectedIndex ){
				return ( [ varStart , i ] );
			}
			
			if ( i == (srcStr.length -1) && varStart >=0){
				return ( [ varStart , i+1 ] );
			}
		}
	}
}


function removeChildren( targetElem ){
	for (var i =targetElem.childNodes.length-1; i>=0; i--) {
		targetElem.removeChild(targetElem.childNodes[i]);
	}

}

function isEditingGraphicsElement(){
	if ( uiMapping.editingGraphicsElement ){
		return ( true );
	} else {
		return ( false );
	}
}
	
return { // svgMapGIStool. で公開する関数のリスト
	editPoint: editPoint,
	initPOItools: initPOItools,
	initPolygonTools: initPolygonTools,
	setTargetObject: setTargetObject,
	isEditingGraphicsElement: isEditingGraphicsElement
}
})();

window.svgMapAuthoringTool = svgMapAuthoringTool;


})( window );

