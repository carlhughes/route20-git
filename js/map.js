$(document).ready(function () {
  require(["esri/views/MapView",
    "esri/Map",
    "esri/tasks/QueryTask",
    "esri/tasks/support/Query",
    "esri/core/watchUtils",
    "esri/widgets/Search",
    "esri/widgets/Swipe",
    "esri/widgets/LayerList",
    "esri/widgets/Measurement",
    "esri/layers/FeatureLayer",
    "esri/layers/WebTileLayer",
    "esri/tasks/Locator",
    "esri/Graphic",
    "esri/views/draw/Draw"
  ], function (MapView, Map, QueryTask, Query, watchUtils, Search, Swipe, LayerList, Measurement, FeatureLayer, WebTileLayer, Locator, Graphic, Draw) {
    var map = new Map({
      basemap: "satellite"
    });
    var pointCheck = false;
    var point;

    var template = {
      title: "Name: {Name}",
      content: "{Comments}"
    };

    var tiledLayer = new WebTileLayer({
      urlTemplate: "https://api.mapbox.com/styles/v1/howardsteinhudson/cjxq85wga5ax61doc2eyz9h90/tiles/256/{level}/{col}/{row}@2x?access_token=pk.eyJ1IjoiaG93YXJkc3RlaW5odWRzb24iLCJhIjoiY2pydjFwMnNuMDI3dDN5cDZqdW1oZ3EzMiJ9.JeijONHIvuh0aVZeOIXAnQ",
      copyright: 'Map tiles by <a href="https://mass.gov/">MassDOT</a>',
      listMode: "hide"
    });

    var commentLayer = new FeatureLayer({
      url: "https://gisdev.massdot.state.ma.us/server/rest/services/CIP/ShrewsburyRoute20CorridorProject/FeatureServer/1",
      title: "Comments",
      popupEnabled: true,
      popupTemplate: template
    });

    var corridorPolygon = new FeatureLayer({
      portalItem: {
        id: "699f61f954eb473dab38090a1f08468f"
      },
      title: "Project Corridor"
    });

    var view = new MapView({
      map: map,
      container: "viewDiv",
      zoom: 14, // Sets zoom level based on level of detail (LOD)
      center: [-71.70, 42.258] // Sets center point of view using longitude,latitude
    });

    map.layers.addMany([tiledLayer, corridorPolygon, commentLayer]);

    var searchWidget = new Search({
      view: view
    });
    view.ui.add(searchWidget, {
      position: "top-left",
      index: 0
    });
    var swipe = new Swipe({
      leadingLayers: [tiledLayer],
      trailingLayers: [],
      direction: "horizontal",
      position: 50,
      visibleElements: {
        divider: true,
        handle: true // handle will not display
      }
    });

    var layerList = new LayerList({
      view: view
    });
    // Adds widget below other elements in the top left corner of the view
    view.ui.add(layerList, {
      position: "top-right"
    });
    var g = document.createElement('div');
    g.setAttribute("id", "swipe");
    g.className = 'esri-widget--button esri-widget esri-interactive';
    g.role = 'button';
    g.innerHTML = '<img src="images/swipe_icon2.png" alt="Swipe Icon" style="width: 20px">'

    var draw = new Draw({
      view: view
    });

    view.ui.add([{
      component: g,
      position: "top-left",
      index: 2
    }]);

    var m = document.createElement('div');
    m.setAttribute("id", "measure");
    m.className = 'esri-widget--button esri-widget esri-interactive';
    m.role = 'button';
    m.innerHTML = '<img src="images/measure_icon.png" alt="Measure Widget" style="width: 20px">'

    view.ui.add([{
      component: m,
      position: "top-left",
      index: 3
    }]);


    var measurement = new Measurement({
      activeTool: "distance"
    });

    $("#swipe").click(function () {
      if (swipe.view) {
        swipe.view = null;
        view.ui.remove(swipe);
      } else {
        swipe.view = view;
        view.ui.add(swipe);
      }
    });

    $("#measure").click(function () {
      if (measurement.view) {
        measurement.view = null;
        view.ui.remove(measurement, "top-right");
      } else {
        measurement.view = view;
        view.ui.add(measurement, "top-right");
      }
    });

    $("#aboutTool, #cancelComment").click(function () {
      event.preventDefault();
      $('#commentsListDiv').hide()
      $('#commentFormDiv').hide();
      $('#helpContents').show();
      $('#commentForm').trigger("reset");
      view.graphics.removeAll();
      $("#getLocation").html('Add Location');
    });


    $("#showComments").submit(function (event) {
      event.preventDefault();
      $('#helpContents').hide()
      $('#commentFormDiv').show();
      $('#commentsListDiv').show();
      showComments();
    })

    $("#getLocation").click(function (event) {
      event.preventDefault();
      $("#getLocation").addClass('active');
      enableCreatePoint(draw, view);
    })

    $("#commentForm").submit(function (event) {
      event.preventDefault();
      var formValue = $(this).serializeArray()
      submitComment(formValue);
    })


    function showComments() {
      $.post("https://gisdev.massdot.state.ma.us/server/rest/services/CIP/ShrewsburyRoute20CorridorProject/FeatureServer/1/query", {
          where: "1=1",
          outFields: "*",
          f: "json",
          returnGeometry: "false",
          returnIdsOnly: "false",
          orderByFields: "OBJECTID"
        })
        .done(function (data) {
          var results = $('#results');
          results.hide();
          results.empty();
          if ($(data.features).length > 0) {
            $(data.features).each(function () {
              results.append("<div class='row w-100 container-fluid m-1 p-0 '><div class='col'><div class='card col comment-row'> <div class='card-body> <h6 class='card-subtitle mb-2 text-muted'>Name: " + this.attributes.Name + "</h6> <p class='card-text'>Comment: " + this.attributes.Comments + "</p></div></div></div></div>");
            });
            results.show();
          } else {
            results.append("This project currently has no comments.");
          }
          results.show();
          $('#projectList').show();
        });

    }

    function submitComment(formValue) {
      theComment = {
        "Name": formValue[0].value,
        "Email": formValue[1].value,
        "Comments": formValue[2].value,
      }
      addFeature = new Graphic({
        attributes: theComment
      });
      if (pointCheck == true) {
        addFeature.geometry = point;
      }
      commentLayer.applyEdits({
        addFeatures: [addFeature],
      }).then(function () {
        showComments();
      });
      $('#commentForm').trigger("reset");
      view.graphics.removeAll();
      $("#getLocation").html('Add Location');
    }


    function enableCreatePoint(draw, view) {
      $("#viewDiv").css("cursor", "crosshair");
      var action = draw.create("point");
      view.graphics.removeAll();
      action.on("draw-complete", function (evt) {
        createPointGraphic(evt.coordinates);
        $("#viewDiv").css("cursor", "");
      });
    }

    var graphic = new Graphic({
      symbol: {
        type: "simple-marker", // autocasts as SimpleMarkerSymbol
        style: "square",
        color: "red",
        size: "16px",
        outline: { // autocasts as SimpleLineSymbol
          color: [255, 255, 0],
          width: 3
        }
      }
    });

    function createPointGraphic(coordinates) {
      point = {
        type: "point", // autocasts as /Point
        x: coordinates[0],
        y: coordinates[1],
        spatialReference: view.spatialReference
      };
      graphic.geometry = point;
      view.graphics.add(graphic);
      pointCheck = true;
      $("#getLocation").removeClass('active');
      $("#getLocation").html('Change Location');
    }
  });
});
