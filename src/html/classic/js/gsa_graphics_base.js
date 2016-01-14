/*
 * Greenbone Security Assistant
 * $Id$
 * Description: Base JavaScript for graphics in GSA.
 *
 * Authors:
 * Timo Pollmeier <timo.pollmeier@greenbone.net>
 *
 * Copyright:
 * Copyright (C) 2014 Greenbone Networks GmbH
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */

/*
 * GSA base object
 */
if (typeof gsa === 'undefined') gsa = {};

// Default date and time formats
gsa.date_format = d3.time.format.utc ("%Y-%m-%d")
gsa.datetime_format = d3.time.format.utc ("%Y-%m-%d %H:%M")

/*
 * Dashboard functions
 */
function Dashboard (id, controllersString, heightsString, filtersString,
                    dashboardOpts)
{
  function my () {};
  var elem = $("#" + id)[0];
  var rows = {};
  var components = {};
  var controllerFactories = {};
  var prevControllersString = controllersString;
  var prevHeightsString = heightsString;
  var lastRowIndex = 0;
  var lastBoxIndex = 0;
  var currentResizeTimeout = null;
  var width = -1;
  var height = -1;
  var topTarget, bottomTarget;
  var editMode = false;
  var totalComponents = 0;
  var controllersPrefRequest;
  var heightsPrefRequest;

  /*
   * Extra options
   */
  // Controller selection preference
  var controllersPrefID = "";
  // Row heights preference
  var heightsPrefID = "";
  // Controller String for new components
  var defaultControllerString = "by-cvss";
  // Filter String for new components
  var defaultFilterString = null;
  // Maximum number of components
  var maxComponents = 8;
  // Maximum number of components per row
  var maxPerRow = 4;

  // Controls element
  var dashboardControls = null;
  var startEditButton = null;
  var stopEditButton = null;
  var newComponentButton = null;

  if (dashboardOpts)
    {
      console.debug ("processing dashboardOpts");
      console.debug (dashboardOpts)

      if (dashboardOpts["controllersPrefID"])
        controllersPrefID = dashboardOpts["controllersPrefID"];
      if (dashboardOpts["heightsPrefID"])
        heightsPrefID = dashboardOpts["heightsPrefID"];
      if (dashboardOpts["defaultFilterString"])
        defaultFilterString = dashboardOpts["defaultFilterString"];
      if (dashboardOpts["defaultControllerString"] !== undefined)
        defaultControllerString = dashboardOpts["defaultControllerString"];
      if (dashboardOpts["defaultFilterString"])
        defaultFilterString = dashboardOpts["defaultFilterString"];
      if (dashboardOpts["maxComponents"])
        maxComponents = dashboardOpts["maxComponents"];
      if (dashboardOpts["maxPerRow"])
        maxPerRow = dashboardOpts["maxPerRow"];
      if (dashboardOpts["dashboardControls"])
        {
          console.debug ("creating control buttons");
          dashboardControls = dashboardOpts["dashboardControls"];

          startEditButton
            = d3.select (dashboardControls)
                  .append ("a")
                    .attr ("href", "javascript:void(0)")
                    .on ("click", function () {my.startEdit ()})
                    .append ("img")
                      .attr ("src", "img/edit.png")
                      .attr ("alt", "Edit Dashboard")
                      .attr ("title", "Edit Dashboard")
                    startEditButton
          startEditButton = startEditButton.node ();

          newComponentButton
            = d3.select (dashboardControls)
                  .append ("a")
                    .attr ("href", "javascript:void(0)")
                    .on ("click", function () {my.newComponent ()})
                    .append ("img")
                      .attr ("src", "img/new.png")
                      .attr ("alt", "Add new Component")
                      .attr ("title", "Add new Component")
          newComponentButton = newComponentButton.node ();
          $(newComponentButton).hide ();

          stopEditButton
            = d3.select (dashboardControls)
                  .append ("a")
                    .attr ("href", "javascript:void(0)")
                    .on ("click", function () {my.stopEdit ()})
                    .append ("img")
                      .attr ("src", "img/stop.png")
                      .attr ("alt", "Stop Editing")
                      .attr ("title", "Stop Editing")
          stopEditButton = stopEditButton.node ();
          $(stopEditButton).hide ();
        }
    }

  my.id = function ()
    {
      return id;
    }

  my.elem = function ()
    {
      return elem;
    }

  my.editMode = function ()
    {
      return editMode;
    }

  my.maxComponents = function ()
    {
      return maxComponents;
    }

  my.maxPerRow = function ()
    {
      return maxPerRow;
    }

  my.addNewRow = function (rowControllersString, rowFiltersString,
                           height, position)
    {
      if (height == undefined)
        height = 280;
      else if (! (height >= 150))
        height = 150;
      var row = DashboardRow (my, rowControllersString, rowFiltersString,
                              height, dashboardOpts);
      rows[row.id()] = row;

      if (position != undefined && position == "top")
        {
          $(elem).prepend (row.elem ());
          $(elem).prepend (topTarget.elem());
        }
      else
        {
          $(elem).append (row.elem ());
          $(elem).append (bottomTarget.elem());
        }
      if (editMode)
        row.startEdit();
      return row;
    }

  my.addToNewRow = function (componentID, position)
    {
      var newRow = my.addNewRow (undefined, undefined, undefined, position);
      $(newRow.elem ()).append (components [componentID].elem ());
      my.resize ();
      my.redraw ();
      my.updateRows ();
    }

  my.registerBox = function (box, rowID)
    {
      components [box.id ()] = box;
    }

  my.unregisterBox = function (id)
    {
      delete components [id];
    }

  my.component = function (id)
    {
      return components [id];
    }

  my.nextRowID = function ()
    {
      lastRowIndex ++;
      return id + "-row-" + lastRowIndex;
    }

  my.nextBoxID = function ()
    {
      lastBoxIndex ++;
      return id + "-box-" + lastBoxIndex;
    }

  my.controllersString = function ()
    {
      return controllersString;
    }

  my.filtersString = function ()
    {
      return filtersString;
    }

  my.updateControllersString = function ()
    {
      controllersString = "";
      var sortedRowElems = $(elem).find (".dashboard-row").toArray ();
      for (var index in sortedRowElems)
        {
          var entry = $(sortedRowElems[index]).attr ("id");
          var rowControllersString = rows[entry].updateControllersString ();
          if (rows[entry].componentsCount () != 0)
            {
              controllersString += rowControllersString
              controllersString += "#";
            }
        }
      controllersString = controllersString.slice (0, -1);
      if (controllersString != prevControllersString)
        {
          console.debug ("controllersString updated to: " + controllersString);
          prevControllersString = controllersString;

          if (controllersPrefID != "")
            {
              if (controllersPrefRequest != null)
                controllersPrefRequest.abort ();

              controllersPrefRequest = d3.xhr ("/omp")

              var form_data = new FormData ();
              form_data.append ("chart_preference_id", controllersPrefID);
              form_data.append ("chart_preference_value", controllersString);
              form_data.append ("token", gsa.gsa_token);
              form_data.append ("cmd", "save_chart_preference");

              controllersPrefRequest.post (form_data);
            }
        }
      else
        {
          console.debug ("controllersString same as before");
        }
      return controllersString;
    }

  my.updateHeightsString = function ()
    {
      heightsString = "";

      var sortedRowElems = $(elem).find (".dashboard-row").toArray ();
      for (var index in sortedRowElems)
        {
          var entry = $(sortedRowElems[index]).attr ("id");
          var rowHeight = rows[entry].height ();
          if (rows[entry].componentsCount () != 0)
            {
              heightsString += rowHeight
              heightsString += "#";
            }
        }
      heightsString = heightsString.slice (0, -1);

      if (heightsString != prevHeightsString)
        {
          console.debug ("heightsString updated to: " + heightsString);

          if (heightsPrefID != "")
            {
              if (heightsPrefRequest != null)
                heightsPrefRequest.abort ();

              heightsPrefRequest = d3.xhr ("/omp")

              var form_data = new FormData ();
              form_data.append ("chart_preference_id", heightsPrefID);
              form_data.append ("chart_preference_value", heightsString);
              form_data.append ("token", gsa.gsa_token);
              form_data.append ("cmd", "save_chart_preference");

              heightsPrefRequest.post (form_data);
            }
        }
      else
        {
          console.debug ("heightsString same as before");
        }
      return heightsString;
    }

  my.updateFiltersString = function ()
    {
      return filtersString;
    }

  my.removeRow = function (id)
    {
      $(rows[id].elem()).hide ("blind", {}, 150,
                               function ()
                                  {
                                    $(rows[id].elem()).remove();
                                    my.resize ();
                                    my.redraw ();
                                    delete rows[id];
                                  });
    }

  my.updateRows = function ()
    {
      totalComponents = 0;
      for (var item in rows)
        {
          rows[item].updateComponents();
          if (rows [item].componentsCount() == 0)
            my.removeRow (item);

          totalComponents += rows[item].componentsCount ();
        }
      if (controllersString != null)
        my.updateControllersString ();
      if (heightsString != null)
        my.updateHeightsString ()
      if (filtersString != null)
        my.updateFiltersString ();
    }

  my.removeComponent = function (id)
    {
      components [id].row().removeComponent (id);
      my.unregisterBox (id);
    }

  my.newComponent = function ()
    {
      if (totalComponents >= maxComponents)
        {
          console.error ("Maximum number of components reached");
          return;
        }

      var lastFreeRowElem
        = $(elem).find (".dashboard-row:not(\".full\")").last ();
      var row;
      if (lastFreeRowElem [0])
        {
          row = rows[lastFreeRowElem.attr("id")];
          var box = DashboardBox (row,
                                  defaultControllerString,
                                  defaultFilterString,
                                  dashboardOpts);
          my.registerBox (box);
          row.registerBox (box);
          $(row.elem ()).append (box.elem ());
          row.resize ();
          row.redraw ();
        }
      else
        {
          // All rows full
          row = my.addNewRow (defaultControllerString, defaultFilterString,
                              undefined, "bottom");
          box = row.lastAddedComponent();
          my.resize ();
          my.redraw ();
        }
      box.selectController (box.controllerString(), false, true);
      my.updateRows ();
    }

  my.loadContent = function ()
    {
      for (var item in rows)
        {
          rows[item].loadContent ();
        }
    }

  my.resized = function (checkHeight)
    {
      if (width == elem.clientWidth)
        return;
      if (checkHeight && height == elem.clientHeight)
        return;
      width = elem.clientWidth;
      height = elem.clientHeight;
      my.resize ();
      clearTimeout(currentResizeTimeout);
      currentResizeTimeout = setTimeout(my.redraw, 50);
    }

  my.resize = function ()
    {
      for (var item in rows)
        {
          if (heightsString == null)
            {
              rows[item].height (elem.clientHeight);
            }
          rows[item].resize ();
        }
    }

  my.redraw = function ()
    {
      for (var item in rows)
        {
          rows[item].redraw ();
        }
    }

  my.addControllerFactory = function (factoryName, factoryFunc)
    {
      controllerFactories [factoryName] = factoryFunc;
    }

  my.addControllersForComponent = function (component)
    {
      for (var factoryName in controllerFactories)
        {
          var newController
            = controllerFactories [factoryName] (component);
        }
    }

  my.initComponentsFromString = function ()
    {
      var rowControllersStringList = [];
      if (controllersString)
        rowControllersStringList = controllersString.split ("#");

      var rowFilterStringList = null;
      if (filtersString)
        rowFiltersStringList = filtersString.split ("#");
      if (heightsString)
        rowHeightsList = heightsString.split ("#");
      else
        rowHeightsList = [];

      for (var index in rowControllersStringList)
        {
          height = parseInt (rowHeightsList[index]);
          if (isNaN (height))
            height = undefined;

          console.debug (height);
          my.addNewRow (rowControllersStringList [index],
                        filtersString ? rowFiltersStringList [index] : null,
                        height);
        }
      my.resize ();
      my.redraw ();

      if (controllersString)
        {
          for (var item in components)
            {
              components[item].updateControllerSelect ();
            }
        }
    }

  my.startEdit = function ()
    {
      if (editMode)
        return;
      editMode = true;
      $(topTarget.elem()).show ("blind", {}, 150);
      $(bottomTarget.elem()).show ("blind", {}, 150);
      $(elem).addClass ("edit");
      for (var item in rows)
        {
          rows[item].startEdit ();
        }

      if (dashboardControls)
        {
          $(startEditButton).hide ();
          $(stopEditButton).show ();
          $(newComponentButton).show ();
        }
    }

  my.stopEdit = function ()
    {
      if (!editMode)
        return;
      $(topTarget.elem()).hide ("blind", {}, 150);
      $(bottomTarget.elem()).hide ("blind", {}, 150);
      editMode = false;
      $(elem).removeClass ("edit");
      for (var item in rows)
        {
          rows[item].stopEdit ();
        }

      if (dashboardControls)
        {
          $(startEditButton).show ();
          $(stopEditButton).hide ();
          $(newComponentButton).hide ();
        }
    }

  width = elem.clientWidth;

  // Window resize
  $(window).on ("resize", my.resized);
  // Check in case other elements cause scrollbar to appear or disappear
  $(window).bind ("DOMSubtreeModified", my.resized);

  // Drop targets for new rows
  topTarget = DashboardNewRowTarget (my, "top");
  $(elem).prepend (topTarget.elem ());
  bottomTarget = DashboardNewRowTarget (my, "bottom");
  $(elem).append (bottomTarget.elem ());

  return my;
}

/*
 * Dashboard Rows
 */
function DashboardRow (dashboard, controllersString, filtersString, height,
                       dashboardOpts)
{
  var my = function () {};
  var components = {};
  var elem = document.createElement ("div");
  $(elem).addClass ("dashboard-row");
  var id = dashboard.nextRowID ();
  $(elem).attr ("id", id);
  var compCountOffset = 0;
  var lastAddedComponent = null;
  var prevHeight = height;

  my.elem = function ()
    {
      return elem;
    }

  my.dashboard = function ()
    {
      return dashboard;
    }

  my.id = function ()
    {
      return id;
    }

  my.height = function (newHeight)
    {
      if (newHeight === undefined)
        return height;

      if (height != newHeight)
        {
          height = newHeight;
          prevHeight = height;
          dashboard.resize ();
        }
    }

  my.component = function (id)
    {
      return components [id];
    }

  my.controllersString = function ()
    {
      return controllersString;
    }

  my.lastAddedComponent = function ()
    {
      return lastAddedComponent;
    }

  my.componentsCount = function ()
    {
      var placeholderCount = $(elem).find (".dashboard-placeholder").toArray().length;
      return Object.keys(components).length + placeholderCount + compCountOffset;
    }

  my.registerBox = function (box)
    {
      components [box.id ()] = box;
      lastAddedComponent = box;
    }

  my.unregisterBox = function (id)
    {
      delete components[id];
    }

  my.filtersString = function ()
    {
      return filtersString;
    }

  my.updateControllersString = function ()
    {
      controllersString = "";
      for (var item in components)
        {
          controllersString += components[item].controllerString ();
          controllersString += "|";
        }
      controllersString = controllersString.slice (0, -1);
      return controllersString;
    }

  my.updateFiltersString = function ()
    {
      return filtersString;
    }

  my.updateComponents = function ()
    {
      var componentElems = $(elem).children ("div.dashboard-box").toArray ();
      var newComponents = {};
      for (var index in componentElems)
        {
          var id = componentElems[index].id;
          newComponents [id] = dashboard.component (id);
          newComponents [id].row (my);
        }
      components = newComponents;
      compCountOffset = 0;

      if (my.componentsCount () >= dashboard.maxPerRow ())
        $(elem).addClass ("full");
      else
        $(elem).removeClass ("full");
    }

  my.removeComponent = function (id)
    {
      components[id].elem ().remove ();

      dashboard.unregisterBox (id);
      my.unregisterBox (id);

      if (my.componentsCount() == 0)
        dashboard.removeRow (my.id ());

      dashboard.updateRows ();
    }

  my.loadContent = function ()
    {
      for (var item in components)
        {
          components[item].loadContent ();
        }
    }

  my.resize = function (newRowWidth, newRowHeight)
    {
      if (newRowHeight)
        {
          height = newRowHeight;
        }

      $(elem).css ("height", height);
      $(elem).attr ("height", height);

      for (var item in components)
        {
          components[item].resize (newRowWidth, newRowHeight);
        }
    }

  my.redraw = function ()
    {
      for (var item in components)
        {
          components[item].redraw ();
        }
    }

  my.startEdit = function ()
    {
      for (var componentID in components)
        {
          components[componentID].startEdit ();
        }

      $(elem)
        .resizable({handles: "s",
                    minHeight: 150,
                    grid: [10, 10],
                    resize: function (event, ui) {my.resize (undefined,
                                                             ui.size.height);
                                                  dashboard.resize (); },
                    stop: function (event, ui) {dashboard.redraw ();
                                                dashboard.updateHeightsString();} });
      $(elem)
        .sortable ({handle: ".chart-head",
                    connectWith: ".dashboard-row:not(\".full\"), .dashboard-add-row",
                    placeholder: "dashboard-placeholder",
                    forcePlaceholderSize: true,
                    opacity: 0.75,
                    tolerance: "pointer",
                    start: function (event, ui)
                              {
                                compCountOffset = -1;
                                dashboard.resize ();
                              },
                    stop: function (event, ui)
                              {
                                dashboard.updateRows ();
                                dashboard.resize ();
                                dashboard.redraw ();
                              },
                    change: function (event, ui)
                              {
                                dashboard.resize();
                              }
                    });
    }

  my.stopEdit = function ()
    {
      for (var componentID in components)
        {
          components[componentID].stopEdit ();
        }

      $(elem).resizable("destroy");
      $(elem).sortable("destroy");
    }

  var componentStringList = [];
  if (controllersString)
    componentStringList = controllersString.split ("|");

  var filterStringList = null;
  if (filtersString)
    filterStringList = filtersStr.split ("|");

  $(elem).css ("height", height);
  $(elem).attr ("height", height);

  for (var index in componentStringList)
    {
      var box = DashboardBox (my,
                              componentStringList [index],
                              filterStringList ? filterStringList [index]
                                               : null,
                              dashboardOpts);
      dashboard.registerBox (box);
      my.registerBox (box);
      $(elem).append (box.elem ());
    }

  return my;
}

/*
 * Dashboard "New Row" drop target
 */
function DashboardNewRowTarget (dashboard, position)
{
  var my = function () {};
  var id = dashboard.id () + "-" + position + "-add";
  var elem = document.createElement ("div");
  $(elem).addClass ("dashboard-add-row");
  $(elem).attr ("id", id);
  $(elem).css ("display", dashboard.editMode() ? "block" : "none");

  my.elem = function ()
    {
      return elem;
    }

  my.dashboard = function ()
    {
      return dashboard;
    }

  my.id = function ()
    {
      return id;
    }

  $(elem)
    .sortable ({handle: ".chart-head",
                forcePlaceholderSize: true,
                opacity: 0.75,
                tolerance: "pointer",
                receive: function (event, ui)
                        {
                          var receivedID = ui.item.attr ("id");
                          $(dashboard.component (receivedID).elem()).remove ();
                          dashboard.addToNewRow (receivedID, position);
                        },
                });

  return my;
}

/*
 * Dashboard Component Boxes
 */
function DashboardBox (row, controllerString, filterString, dashboardOpts)
{
  var my = function () {};
  var dashboard = row ? row.dashboard () : null;
  var id = dashboard.nextBoxID ();
  var controllers = [];
  var controllerIndexes = {};
  var currentCtrlIndex = -1;

  var last_generator = null;
  var last_gen_params = null;

  var hideControllerSelect;

  if (dashboardOpts)
    {
      if (dashboardOpts["hideControllerSelect"])
        hideControllerSelect = dashboardOpts["hideControllerSelect"];
    }

  var elem = document.createElement ("div");
  $(elem).addClass ("dashboard-box")
         .attr ("id", id);
  var innerElem_d3 = d3.select (elem)
                          .append ("div")
                            .attr ("class", "chart-box")
  var innerElem = innerElem_d3.node();

  var menu, header, topButtons, content, content_d3, footer, select_elem, svg;
  menu
    = innerElem_d3
        .append ("div")
          .attr ("id", "chart_list")
            .append ("ul")
              .append ("li");
  menu.append ("a")
        .attr ("id", "section_list_first");
  menu = menu.append ("ul")
          .attr ("id", id + "-menu");
  menu = menu.node();

  topButtons
    = innerElem_d3
        .append ("div")
          .attr ("class", "chart-top-buttons")
  topButtons
    .append ("a")
      .attr ("class", "remove-button")
      .attr ("href", "javascript:void(0);")
      .on ("click", function () { my.remove (); })
      .style ("display", dashboard.editMode () ? "inline" : "none")
      .append ("img")
        .attr ("src", "/img/delete.png")
        .attr ("alt", "Remove")
        .attr ("title", "Remove");

  header
    = innerElem_d3
        .append ("div")
          .attr ("class", "chart-head")
          .attr ("id", id + "-head")
          .text ("Initializing component \"" + controllerString + "\"...");
  header = header.node()

  content_d3
    = innerElem_d3
        .append ("div")
          .attr ("class", "dash-box-content")
          .attr ("id", id + "-content");

  svg
    = content_d3
        .append ("svg")
          .attr ("class", "chart-svg")
          .attr ("id", id + "-svg")
          .attr ("width", 450)
          .attr ("height", 250);
  svg = svg.node()

  footer
    = innerElem_d3
        .append ("div")
          .attr ("class", "chart-foot")
          .attr ("id", id + "-foot")
  footer = footer.node()

  my.elem = function ()
    {
      return elem;
    }

  my.header = function ()
    {
      return d3.select(header);
    }

  my.svg = function ()
    {
      return d3.select(svg);
    }

  my.row = function (newRow)
    {
      if (newRow === undefined)
        return row;
      row = newRow;
      return my;
    }

  my.dashboard = function ()
    {
      return dashboard;
    }

  my.id = function ()
    {
      return id;
    }

  my.controllerString = function (newStr)
    {
      if (newStr === undefined)
        return controllerString;
      controllerString = newStr;
      dashboard.updateControllersString ();
    }

  my.filterString = function (newStr)
    {
      if (newStr === undefined)
        return filterString;
      filterString = newStr;
      dashboard.updateFiltersString ();
    }

  my.addController = function (controllerName, controller)
    {
      controllerIndexes[controllerName] = controllers.length;
      controllers.push (controller);
    }

  my.remove = function ()
    {
      $(elem).hide ("fade", {}, 250,
                    function ()
                      {
                        dashboard.removeComponent (id);
                        row.resize ();
                        row.redraw ();
                      });
    }

  my.resize = function (newRowWidth, newRowHeight)
    {
      var rowWidth, rowHeight;
      var componentsCount = row.componentsCount ();
      // Set height first
      if (newRowHeight === undefined)
        rowHeight = $(row.elem()).attr ("height");
      else
        rowHeight = newRowHeight;
      var newHeight = rowHeight - header.clientHeight - footer.clientHeight - 8;
      my.svg().attr ("height", newHeight);

      if (newRowWidth === undefined)
        rowWidth = dashboard.elem().clientWidth;
      else
        rowWidth = newRowWidth;
      var newWidth = (rowWidth - (row.componentsCount () * 8) - 2) / (componentsCount ? componentsCount : 1);
      my.svg().attr ("width", newWidth);
      $(elem).css ("width", newWidth);
    }

  my.redraw = function ()
    {
      my.applySelect2 ();
      if (currentCtrlIndex >= 0)
        controllers [currentCtrlIndex].request_data ();
    }

  // Edit management
  my.startEdit = function ()
    {
      topButtons.select(".remove-button")
        .style ("display", "inline");
    }

  my.stopEdit = function ()
    {
      topButtons.select(".remove-button")
        .style ("display", "none");
    }

  // Data management

  /* Gets the last successful generator */
  my.last_generator = function ()
    {
      return last_generator;
    }

  /* Gets the parameters for the last successful generator run */
  my.last_gen_params = function ()
    {
      return last_gen_params;
    }

  /* Updates the data on the last successful generator.
   * Should be called by the generator if it was successful */
  my.update_gen_data = function (generator, gen_params)
    {
      last_generator = generator;
      last_gen_params = gen_params;
      return my;
    }

  /* Puts an error message into the header and clears the svg element */
  my.show_error = function (message)
    {
      header.text (message);
      svg.text ("");
    }

  /* Gets a menu item or creates it if it does not exist */
  my.create_or_get_menu_item = function (menu_item_id, last)
    {
      var menu_d3 = d3.select(menu)
      var item = menu_d3
                  .select ("li #" + id + "_" + menu_item_id)
                    .select ("a");

      if (item.empty ())
      {
        var li = menu_d3.append ("li");
        if (last)
            li.attr ("class", "last");
          item = li.attr ("id", id + "_" + menu_item_id).append ("a");
      }

      return item;
    }

  // Controller selection

  my.updateControllerSelect = function ()
    {
      if (select_elem)
        {
          $(select_elem.node ()).select2 ("val", controllerString);
        }
      else
        {
          my.selectController (controllerString, false, true)
        }
    }

  my.selectController = function (name, savePreference, requestData)
    {
      var index = controllerIndexes [name];
      if (index == undefined)
        {
          console.warn ("Chart not found: " + name);
          my.selectControllerIndex (0, savePreference, requestData);
        }
      else
        {
          my.selectControllerIndex (index, savePreference, requestData);
        }
    }

  my.selectControllerIndex = function (index, savePreference, requestData)
    {
      if (typeof (index) != "number" || index < 0 || index >= controllers.length)
        return console.error ("Invalid chart index: " + index);
      currentCtrlIndex = index;
      my.controllerString (controllers [currentCtrlIndex].id ());

      if (requestData)
        controllers [currentCtrlIndex].request_data ();

    }

  my.prevController = function ()
    {
      if (currentCtrlIndex <= 0)
        $(select_elem.node ())
          .select2 ("val", controllers[controllers.length - 1].id ());
      else
        $(select_elem.node ())
          .select2 ("val", controllers[currentCtrlIndex - 1].id ());
    }

  my.nextController = function ()
    {
      if (currentCtrlIndex >= controllers.length - 1)
        $(select_elem.node ())
          .select2 ("val", controllers[0].id ());
      else
        $(select_elem.node ())
          .select2 ("val", controllers[currentCtrlIndex + 1].id ());
    }

  /* Adds a chart selector to the footer */
  my.createChartSelector = function ()
  {
    d3.select(footer)
        .append ("a")
          .attr ("href", "javascript: void (0);")
          .attr ("onclick",
                 "gsa.dashboards [\"" + dashboard.id() + "\"]"
                 + ".component(\"" + id + "\").prevController()")
          .append ("img")
            .attr ("src", "img/previous.png")
            .style ("vertical-align", "middle")

    select_elem = d3.select(footer)
                      .append ("select")
                        .style ("margin-left", "5px")
                        .style ("margin-right", "5px")
                        .style ("vertical-align", "middle")
                        .attr ("onchange",
                               "gsa.dashboards [\"" + dashboard.id() + "\"]"
                               + ".component(\"" + id + "\")"
                               + ".selectController (this.value, true, true)");

    for (var controllerID in controllers)
      {
        var controller = controllers [controllerID];
        select_elem.append ("option")
                      .attr ("value", controller.chart_name ())
                      .attr ("id", id + "_chart_opt_" + controllerID)
                      .text (controller.label ())
      }

    d3.select(footer)
        .append ("a")
          .attr ("href", "javascript: void (0);")
          .attr ("onclick",
                 "gsa.dashboards [\"" + dashboard.id() + "\"]"
                 + ".component(\"" + id + "\").nextController()")
          .append ("img")
            .attr ("src", "img/next.png")
            .style ("vertical-align", "middle")
  }

  my.applySelect2 = function ()
  {
    if (! hideControllerSelect)
      {
        $(elem).find (".select2-container").remove ();
        $(select_elem.node ()).select2 ();
      }
  }

  dashboard.addControllersForComponent (my);
  if (! (hideControllerSelect))
    {
      my.createChartSelector ();
    }

  return my;
}

/*
 * Creates a new Chart controller which manages the data source, generator and
 *  display of a chart
 *
 * Parameters:
 *  p_data_src:  The DataSource to use
 *  p_generator: The chart generator to use
 *  p_display:   The Display to use
 */
function Chart (p_data_src, p_generator, p_display,
                p_chart_name, p_label, p_icon, add_to_display,
                p_chart_type, p_chart_template, p_gen_params, p_init_params)
{
  var data_src = p_data_src;
  var generator = p_generator;
  var gen_params = p_gen_params;
  var init_params = p_init_params;
  var display = p_display;
  var chart_type = p_chart_type;
  var chart_template = p_chart_template;
  var chart_name = p_chart_name;
  var label = p_label ? p_label : "Unnamed chart";
  var icon = p_icon ? p_icon : "/img/help.png";
  var current_request = null;

  function my () {};

  if (add_to_display)
    display.addController (chart_name, my);

  my.id = function ()
    {
      return chart_name;
    }

  /* Gets or sets the data source */
  my.data_src = function (value)
    {
      if (!arguments.length)
        return data_src;
      data_src = value;
      return my;
    }

  /* Gets or sets the generator */
  my.generator = function (value)
    {
      if (!arguments.length)
        return generator;
      generator = value;
      return my;
    }

  /* Gets or sets the display */
  my.display = function (value)
    {
      if (!arguments.length)
        return display;
      display = value;
      return my;
    }

  /* Gets the chart name */
  my.chart_name = function ()
    {
      return chart_name;
    }

  /* Gets or sets the label */
  my.label = function (value)
    {
      if (!arguments.length)
        return label;
      label = value;
      return my;
    }

  /* Gets or sets the icon */
  my.icon = function (value)
    {
      if (!arguments.length)
        return icon;
      icon = value;
      return my;
    }

  /* Gets the chart type */
  my.chart_type = function ()
    {
      return chart_type;
    }

  /* Gets the chart template */
  my.chart_template = function ()
    {
      return chart_template;
    }

  /* Gets or sets the current request */
  my.current_request = function (value)
    {
      if (!arguments.length)
        return current_request;
      current_request = value;
      return my;
    }

  /* Delegates a data request to the data source */
  my.request_data = function (p_gen_params)
    {
      if (p_gen_params)
        gen_params = p_gen_params;

      data_src.request_data (this, gen_params);
    }

  /* Shows the "Loading ..." text in the display */
  my.show_loading = function ()
    {
      generator.show_loading (display);
    }

  /* Callback for when data has been loaded */
  my.data_loaded = function (data, gen_params)
    {
      generator.generate (data, this, gen_params);
    }

  /* Construct URL for detached chart */
  my.detached_url = function ()
    {
      var extra_params_str = ""
      if (gen_params.x_field != null)
        {
          extra_params_str = extra_params_str + "&x_field=" + gen_params.x_field;
        }
      if (gen_params.y_fields != null)
        {
          for (var field in gen_params.y_fields)
            {
              extra_params_str = extra_params_str + "&y_fields:"
                                  + (1 + Number(field))
                                  + "=" + gen_params.y_fields[field]
            }
        }
      if (gen_params.z_fields != null)
        {
          for (var field in gen_params.z_fields)
            {
              extra_params_str = extra_params_str + "&z_fields:"
                                  + (1 + Number(field))
                                  + "=" + gen_params.z_fields[field]
            }
        }
      for (var param in init_params)
        {
          extra_params_str = extra_params_str + "&chart_init:" + param
                              + "=" + init_params[param] + ""
        }
      for (var param in gen_params.extra)
        {
          extra_params_str = extra_params_str + "&chart_gen:" + param
                              + "=" + gen_params.extra[param] + ""
        }

      var command = data_src.command ();
      if (command != "get_aggregate")
        command = command + "_chart";

      return create_uri (command,
                         data_src.params (),
                         data_src.prefix (),
                         true)
             + "&chart_type=" + chart_type
             + "&chart_template=" + chart_template
             + encodeURI (extra_params_str)
    }

  return my;
}


/*
 * Data source (parameters for GSA request, XML response cache)
 *
 * Parameters:
 *  command: command name like "get_aggregate"
 *  params:  parameters for the command
 *  prefix:  prefix for OMP commands
 */
function DataSource (command, params, prefix)
{
  var prefix = (undefined == prefix) ? "/omp?" : prefix;
  var command;
  var params = (params == undefined) ? {} : params;
  var data_uri = null;
  var last_uri = null;
  var column_info = {};
  var data = {};

  function my () {};

  /* Gets or sets the prefix */
  my.prefix = function (value)
    {
      if (!arguments.length)
        return prefix;
      prefix = value;
      return my;
    }

  /* Gets or sets the command name */
  my.command = function (value)
    {
      if (!arguments.length)
        return command;

      command = value;
      return my;
    }

  /* Gets or sets a parameter */
  my.param = function (param_name, value)
    {
      if (!arguments.length)
        return undefined;
      else if (arguments.length == 1)
        return params [param_name];
      else
        params [param_name] = value;
      return my;
    }

  /* Gets the parameters array */
  my.params = function ()
    {
      return params;
    }

  /* Removes a parameter */
  my.delete_param = function (param_name)
    {
      delete params [param_name];
      return my;
    }

  /* Gets the current data URI */
  my.data_uri = function ()
    {
      return data_uri;
    }

  /* Gets the URI of the last successful request */
  my.last_uri = function ()
    {
      return last_uri;
    }

  /* Gets the Column data of the last successful request */
  my.column_info = function ()
    {
      return column_info;
    }

  /* Sends an HTTP request to get XML data.
   * Once the data is loaded, the chart will be notified via the
   * data_loaded callback */
  my.request_data = function (chart, gen_params, ignore_cache)
    {
      data_uri = create_uri (command, params, prefix);

      if (ignore_cache || last_uri != data_uri)
        {
          chart.show_loading ();

          if (chart.current_request () != null)
            chart.current_request ().abort ();

          chart.current_request (d3.xml (data_uri, "application/xml"));
          chart.current_request ()
                 .get (function (error, xml)
                        {
                          if (error)
                            {
                              if (error instanceof XMLHttpRequest)
                                {
                                  if (error.status === 0)
                                    {
                                      output_error (chart, "Loading aborted");
                                      return;
                                    }
                                  else
                                    {
                                      output_error (chart, "HTTP error " + error.status, "Error: HTTP request returned status " + error.status + " for URL: " + data_uri);
                                      return;
                                    }
                                }
                              else
                                {
                                  output_error (chart, "Error reading XML", "Error reading XML from URL '" + data_uri + "': " + error);
                                  return;
                                }
                            }
                          else
                            {
                              var xml_select = d3.select(xml.documentElement);
                              if (xml.documentElement.localName == "parsererror")
                                {
                                  output_error (chart, "Error parsing XML data", "Error parsing XML data, details follow in a debug message", xml.documentElement.textContent);
                                  return;
                                }
                              last_uri = data_uri;

                              if (command == "get_aggregate")
                                {
                                  var omp_status
                                        = xml_select.select ("get_aggregate get_aggregates_response")
                                                      .attr ("status");
                                  var omp_status_text
                                        = xml_select.select ("get_aggregate get_aggregates_response")
                                                      .attr ("status_text");

                                  if (omp_status != "200")
                                    {
                                      output_error (chart,
                                                    "Error " + omp_status
                                                    + ": " + omp_status_text,
                                                    "OMP Error " + omp_status
                                                    + ": " + omp_status_text)
                                      return my;
                                    }

                                  data = { original_xml : xml_select,
                                           records : extract_simple_records (xml_select, "aggregate group"),
                                           column_info : extract_column_info (xml_select, gen_params),
                                           filter_info : extract_filter_info (xml_select, gen_params) };
                                }
                              else if (command == "get_tasks")
                                {
                                  var omp_status
                                        = xml_select.select ("get_tasks get_tasks_response")
                                                      .attr ("status");
                                  var omp_status_text
                                        = xml_select.select ("get_tasks get_tasks_response")
                                                      .attr ("status_text");

                                  if (omp_status != "200")
                                    {
                                      output_error (chart,
                                                    "Error " + omp_status
                                                    + ": " + omp_status_text,
                                                    "OMP Error " + omp_status
                                                    + ": " + omp_status_text)
                                      return my;
                                    }

                                  data = { original_xml : xml_select,
                                           records : extract_task_records (xml_select),
                                           column_info : tasks_column_info (),
                                           filter_info : extract_filter_info (xml_select) };
                                }
                              else
                                {
                                  output_error (chart, "Internal error: Invalid request", "Invalid request command: \"" + command + "\"")
                                  return my;
                                }
                              chart.data_loaded (data, gen_params);
                              chart.current_request (null);
                            }
                        });
        }
      else
        {
          chart.data_loaded (data, gen_params);
        }
      return my;
    }

  my.command (command);

  return my;
}

/*
 * Display
 *
 * Parameters:
 *  p_container: the div containing the header, svg and footer elements
 */
function Display (p_container)
{
  var container = p_container;
  var name = container.attr ("id");
  var menu = container.select ("#" + container.attr ("id") + "-menu");
  var header = container.select ("#" + container.attr ("id") + "-head");
  var svg = container.select ("#" + container.attr ("id") + "-svg");
  var footer = container.select ("#" + container.attr ("id") + "-foot");
  var select_elem = null;
  var filter_elem = null;
  var requested = false;

  var charts = [];
  var chart_i = 0;
  var chart_name_indexes = {};

  var filters = {"": { name:"--", term:"" }};

  var last_generator = null;
  var last_gen_params = null;

  var select_pref_id = "";
  var filter_pref_id = "";
  var chart_pref_request = null;

  function my() {};

  /* Gets the Display name */
  my.display_name = function ()
    {
      return name;
    }

  /* Gets the header element */
  my.header = function ()
    {
      return header;
    }

  /* Gets the svg element */
  my.svg = function ()
    {
      return svg;
    }

  /* Gets the footer element */
  my.footer = function ()
    {
      return footer;
    }

  /* Gets whether the chart has been requested at least once */
  my.requested = function ()
    {
      return requested;
    }

  /* Adds a new chart to the list */
  my.add_chart = function (new_chart)
    {
      charts.push (new_chart);
    }

  /* Gets the last successful generator */
  my.last_generator = function ()
    {
      return last_generator;
    }

  /* Gets the parameters for the last successful generator run */
  my.last_gen_params = function ()
    {
      return last_gen_params;
    }

  /* Updates the data on the last successful generator.
   * Should be called by the generator if it was successful */
  my.update_gen_data = function (generator, gen_params)
    {
      last_generator = generator;
      last_gen_params = gen_params;
      return my;
    }

  /* Puts an error message into the header and clears the svg element */
  my.show_error = function (message)
    {
      header.text (message);
      svg.text ("");
    }

  /* Gets a menu item or creates it if it does not exist */
  my.create_or_get_menu_item = function (id, last)
    {
      var item = menu.select ("li #" + name + "_" + id)
                      .select ("a");

      if (item.empty ())
	    {
	      var li = menu.append ("li");
	      if (last)
            li.attr ("class", "last");
          item = li.attr ("id", name + "_" + id).append ("a");
	    }

      return item;
    }

  /* Adds a chart selector to the footer */
  my.create_chart_selector = function ()
  {
    footer.append ("a")
          .attr ("href", "javascript: void (0);")
          .attr ("onclick", "gsa.displays [\"" + name + "\"].prev_chart ()")
          .append ("img")
            .attr ("src", "img/previous.png")
            .style ("vertical-align", "middle")

    select_elem = footer.append ("select")
                          .style ("margin-left", "5px")
                          .style ("margin-right", "5px")
                          .style ("vertical-align", "middle")
                          .attr ("onchange", "gsa.displays [\""+ name + "\"].select_chart (this.value, true, true)");

    for (var i = 0; i < charts.length; i++)
      {
        chart_name_indexes [charts [i].chart_name ()] = i
        select_elem.append ("option")
                      .attr ("value", charts [i].chart_name ())
                      .attr ("id", name + "_chart_opt_" + i)
                      .text (charts [i].label ())
      }

    footer.append ("a")
          .attr ("href", "javascript: void (0);")
          .attr ("onclick", "gsa.displays [\"" + name + "\"].next_chart ()")
          .append ("img")
            .attr ("src", "img/next.png")
            .style ("vertical-align", "middle")
  }

  /* Creates a filter selector */
  my.create_filter_selector = function ()
    {
      filter_elem = footer.append ("div")
                            .attr ("id", name + "_filter_selector")
                            .text ("Filter: ")
                              .append ("select")
                              .attr ("onchange", "gsa.displays [\""+ name + "\"].select_filter (this.value, true, true)")
      filter_elem.append ("option")
                  .text ("--")
                  .attr ("value", "")
    }

  /* Adds a filter to the selector */
  my.add_filter = function (id, filter_name, term)
    {
      filters [id] = {name: filter_name, term: term}
      d3.select ("#" + name + "_filter_selector select")
          .append ("option")
            .text (filter_name)
            .attr ("value", id)
            .attr ("id", name + "_filter_opt_" + id)
    }

  my.select_filter = function (filter_id, save_preference, request_data)
    {
      if (filters [filter_id] == undefined)
        {
          console.warn ("Filter not found: " + filter_id)
          my.select_filter ("", save_preference, request_data);
          return;
        }

      for (var chart in charts)
        {
          charts[chart].data_src ().delete_param ("filter");
          charts[chart].data_src ().param ("filt_id", filter_id);
        }

      if (request_data)
        charts [chart_i].request_data (my);

      if (save_preference && select_pref_id != "")
        {
          if (chart_pref_request != null)
            chart_pref_request.abort ();

          chart_pref_request = d3.xhr ("/omp")

          var form_data = new FormData ();
          form_data.append ("chart_preference_id", filter_pref_id);
          form_data.append ("chart_preference_value", filter_id);
          form_data.append ("token", gsa.gsa_token);
          form_data.append ("cmd", "save_chart_preference");

          chart_pref_request.post (form_data);
        }

      filter_elem.select ("option#" + name + "_filter_opt_" + filter_id)
                                    .property ("selected", "selected")
    }

  my.select_pref_id = function (value)
    {
      if (!arguments.length)
        return select_pref_id;

      select_pref_id = value;

      return my;
    }

  my.filter_pref_id = function (value)
    {
      if (!arguments.length)
        return filter_pref_id;

      filter_pref_id = value;

      return my;
    }

  my.width = function (new_width)
    {
      if (!arguments.length)
        return container.property ("clientWidth");

      svg.attr ("width",
                Math.max (new_width, 200));
      return my;
    }

  my.height = function (new_height)
    {
      if (!arguments.length)
        return container.property ("clientHeight");

      svg.attr ("height",
                Math.max (new_height - (header.property ("clientHeight") + footer.property ("clientHeight")), 100));
      return my;
    }

  /* refreshes the current chart */
  my.refresh = function ()
    {
      requested = true;
      charts [chart_i].request_data ();
    }

  /* Selects and shows a chart from the charts list by name */
  my.select_chart = function (name, save_preference, request_data)
    {
      if (chart_name_indexes [name] == undefined)
        {
          console.warn ("Chart not found: " + name);
          my.select_chart_index (0, save_preference, request_data)
        }
      else
        my.select_chart_index (chart_name_indexes [name],
                               save_preference, request_data)
    }

  /* Selects and shows a chart from the charts list by index */
  my.select_chart_index = function (index, save_preference, request_data)
    {
      if (typeof (index) != "number" || index < 0 || index >= charts.length)
        return console.error ("Invalid chart index: " + index);
      chart_i = index;

      if (request_data)
        charts [index].request_data ();

      if (save_preference && select_pref_id != "")
        {
          if (chart_pref_request != null)
            chart_pref_request.abort ();

          chart_pref_request = d3.xhr ("/omp")

          var form_data = new FormData ();
          form_data.append ("chart_preference_id", select_pref_id);
          form_data.append ("chart_preference_value", charts [index].chart_name ());
          form_data.append ("token", gsa.gsa_token);
          form_data.append ("cmd", "save_chart_preference");

          chart_pref_request.post (form_data);
        }

      select_elem.select ("option#" + name + "_chart_opt_" + (index))
                  .property ("selected", "selected")
    }

  /* Selects and shows the previous chart from the charts list if possible */
  my.prev_chart = function ()
    {
      if (chart_i > 0)
        my.select_chart_index (chart_i - 1, true, true);
      else
        my.select_chart_index (charts.length - 1, true, true);
    }

  /* Selects and shows the next chart from the charts list if possible */
  my.next_chart = function ()
    {
      if (chart_i < charts.length - 1)
        my.select_chart_index (chart_i + 1, true, true);
      else
        my.select_chart_index (0, true, true);
    }

  return my;
}

/*
 * Generic helper functions
 */

/*
 * Unescapes XML entities
 */
function unescapeXML (string)
{
  if (gsa.parser === undefined)
    gsa.parser = new DOMParser ();

  var doc = gsa.parser.parseFromString("<doc>" + string + "</doc>",
                                       "application/xml");
  return doc.documentElement.textContent;
}

/*
 * Data Source Helper functions
 */

/*
 * creates a GSA request URI from a command name, parameters array and prefix
 */
function create_uri (command, params, prefix, no_xml)
{
  var params_str = prefix + "cmd=" + command;
  for (var prop_name in params)
    {
      if (!no_xml || prop_name != "xml")
        {
          if (params[prop_name] instanceof Array)
            {
              for (var i = 0; i < params[prop_name].length; i++)
                {
                  params_str = (params_str + "&" + prop_name + ":" + i
                                + "=" + params[prop_name][i]);
                }
            }
          else
            params_str = (params_str + "&" + prop_name
                          + "=" + params[prop_name]);
        }
    }
  params_str = params_str + "&token=" + gsa.gsa_token;
  return encodeURI (params_str);
}

/*
 * Extracts records from XML
 */
function extract_simple_records (xml_data, selector)
{
  var records = [];
  xml_data.selectAll (selector)
            .each (function (d, i)
                    {
                      var record = {};
                      d3.select(this)
                          .selectAll ("value, count, c_count, stats, text")
                            .each (function (d, i)
                                    {
                                      if (this.localName == "stats")
                                        {
                                          var col_name = d3.select (this).attr ("column");
                                          d3.select (this)
                                            .selectAll ("*")
                                              .each (function (d, i)
                                                      {
                                                        if (!isNaN (parseFloat (d3.select (this).text ()))
                                                            && isFinite (d3.select (this).text ()))
                                                          record [col_name + "_" + this.localName]
                                                            = parseFloat (d3.select (this).text ())
                                                        else
                                                          record [col_name + "_" + this.localName]
                                                            = d3.select (this).text ()
                                                      });
                                        }
                                      else if (this.localName == "text")
                                        {
                                          record [d3.select (this).attr ("column")]
                                            = d3.select (this).text ()
                                        }
                                      else
                                        {
                                          if (!isNaN (parseFloat (d3.select (this).text ()))
                                              && isFinite (d3.select (this).text ()))
                                            record [this.localName]
                                              = parseFloat (d3.select (this).text ())
                                          else
                                            record [this.localName]
                                              = d3.select (this).text ()
                                        }
                                    });
                      records.push (record);
                     });
  return records;
}

/*
 * Extracts column info from XML
 */
function extract_column_info (xml_data, gen_params)
{
  var column_info = { group_columns : [],
                      data_columns : [],
                      text_columns : [],
                      columns : {} };

  xml_data.selectAll ("aggregate column_info aggregate_column")
            .each (function (d, i)
                    {
                      var column = {};
                      d3.select(this)
                          .selectAll ("*")
                            .each (function (d, i)
                                    {
                                      if (!isNaN (parseFloat (d3.select (this).text ()))
                                          && isFinite (d3.select (this).text ()))
                                        column [this.localName]
                                          = parseFloat (d3.select (this).text ())
                                      else
                                        column [this.localName]
                                          = d3.select (this).text ()
                                    });
                      column_info.columns [column.name] = column;
                     });

  xml_data.selectAll ("aggregate group_column")
            .each (function (d, i)
                    {
                      column_info.group_columns.push (d3.select (this).text ())
                    })

  xml_data.selectAll ("aggregate data_column")
            .each (function (d, i)
                    {
                      column_info.data_columns.push (d3.select (this).text ())
                    })

  xml_data.selectAll ("aggregate text_column")
            .each (function (d, i)
                    {
                      column_info.text_columns.push (d3.select (this).text ())
                    })

  return column_info;
}

/*
 * Gets column info for get_tasks
 */
function tasks_column_info ()
{
  return {
    columns : {
      id : {
        name : "id",
        stat : "value",
        type : "task",
        column : "id",
        data_type : "uuid"
      },
      name : {
        name : "name",
        stat : "value",
        type : "task",
        column : "name",
        data_type : "text"
      },
      schedule_id : {
        name : "schedule_id",
        stat : "value",
        type : "task",
        column : "schedule_id",
        data_type : "uuid"
      },
      schedule_name : {
        name : "schedule_name",
        stat : "value",
        type : "task",
        column : "schedule_name",
        data_type : "text"
      },
      schedule_next_time : {
        name : "schedule_next_time",
        stat : "value",
        type : "task",
        column : "schedule_next_time",
        data_type : "iso_time"
      },
      schedule_trash : {
        name : "schedule_trash",
        stat : "value",
        type : "task",
        column : "schedule_trash",
        data_type : "integer"
      },
      schedule_first_time : {
        name : "schedule_first_time",
        stat : "value",
        type : "task",
        column : "schedule_first_time",
        data_type : "iso_time"
      },
      schedule_period : {
        name : "schedule_period",
        stat : "value",
        type : "task",
        column : "schedule_period",
        data_type : "integer"
      },
      schedule_period_months : {
        name : "schedule_period_months",
        stat : "value",
        type : "task",
        column : "schedule_period_months",
        data_type : "integer"
      },
      schedule_duration : {
        name : "schedule_duration",
        stat : "value",
        type : "task",
        column : "schedule_duration",
        data_type : "integer"
      },
      schedule_periods : {
        name : "schedule_periods",
        stat : "value",
        type : "task",
        column : "schedule_periods",
        data_type : "integer"
      }
    }
  }
}

/*
 * Extracts filter info from XML
 */
function extract_filter_info (xml_data, gen_params)
{
  var filter_info = { };

  filter_info.id =  xml_data.selectAll ("filters").attr ("id");
  filter_info.term =  xml_data.selectAll ("filters term").text ()

  if (! xml_data.selectAll ("filters name").empty ())
    filter_info.name = xml_data.selectAll ("filters name").text ()
  else
    filter_info.name = "";

  return filter_info;
}


/*
 * Extracts records from XML
 */
function extract_task_records (xml_data)
{
  var records = [];
  xml_data.selectAll ("task")
            .each (function (d, i)
                    {
                      var task = d3.select (this);
                      var schedule = task.select ("schedule");
                      var periods = task.select ("schedule_periods");

                      var record = { id : task.attr ("id"),
                                     name : task.select ("name").text () };
                      record ["schedule_id"] = schedule.attr ("id")
                          schedule.selectAll ("*")
                            .each (function (d, i)
                                    {
                                      record ["schedule_" + this.localName]
                                        = this.textContent;
                                    })

                      if (periods.node())
                        {
                          record ["schedule_periods"] = periods.text ();
                        }

                      records.push (record);
                     });

  return records;
}


/*
 * Helpers for processing extracted data
 */

/*
 * Finds the index of a record by the value of a given field
 */
function find_record_index (records, value, field)
{
  for (index in records)
    {
      if (records [index][field].getTime() == value.getTime())
        return index;
    }
  return -1;
}

/*
 * Gets capitalized resource and attribute names
 */
function capitalize (str)
{
  switch (str.toLowerCase ())
    {
      case "nvt":
      case "cve":
      case "cpe":
        return str.toUpperCase ();
        break;
      default:
        var split_str = str.split ("_");
        for (var i in split_str)
          {
            split_str [i] = split_str [i].charAt (0).toUpperCase ()
                            + split_str [i].slice (1);
          }
        return split_str.join(" ");
    }
}

/*
 * Gets the full name of a resource type.
 */
function resource_type_name (type)
{
  switch (type.toLowerCase())
    {
      case "ovaldef":
        return "OVAL definition"
      case "cert_bund_adv":
        return "CERT-Bund Advisory"
      case "dfn_cert_adv":
        return "DFN-CERT Advisory"
      case "allinfo":
        return "SecInfo Item"
      default:
        return capitalize (type);
    }
}

/*
 * Gets the plural form of the full name of a resource type.
 */
function resource_type_name_plural (type)
{
  switch (type.toLowerCase())
    {
      case "dfn_cert_adv":
        return "DFN-CERT Advisories"
      case "cert_bund_adv":
        return "CERT-Bund Advisories"
      default:
        return resource_type_name (type) + "s"
    }
}

/*
 * Gets the full form of an aggregate field.
 */
function field_name (field, type)
{
  switch (field.toLowerCase())
    {
      case "c_count":
        return "total " + resource_type_name_plural (type)
      case "count":
        return resource_type_name_plural (type)
      case "created":
        return "creation time"
      case "modified":
        return "modification time"
      case "qod":
        return "QoD"
      case "qod_type":
        return "QoD type"
      case "high":
        return "High"
      case "high_per_host":
        return "High / host"
      default:
        return field;
    }
}

/*
 * Generates a label from a column info object.
 */
function column_label (info, capitalize_label, include_type, include_stat)
{
  if (info.label_generator)
    return info.label_generator (info, capitalize_label,
                                 include_type, include_stat)
  else
    return default_column_label (info, capitalize_label,
                                 include_type, include_stat)
}

/*
 * Generates a label in the default format from a column info object.
 */
function default_column_label (info, capitalize_label,
                               include_type, include_stat)
{
  var label = "";
  if (include_stat)
    switch (info.stat)
      {
        case "min":
          label = label + "min. ";
          break;
        case "max":
          label = label + "max. ";
          break;
        case "mean":
          label = label + "average ";
          break;
        case "sum":
          label = label + "summed ";
          break;
      }

  label = label + field_name (info.column ? info.column : info.stat,
                              info.type);

  if (include_type && info.stat != "count" && info.stat != "c_count")
    label = label + " (" + resource_type_name (info.type) + ")";
  if (capitalize_label)
    return capitalize (label)
  else
    return label;
}

/**
 * Generates a string representation of a data value using the column info.
 */
function format_data (value, col_info_item)
{
  if (col_info_item && col_info_item.data_formatter)
    col_info_item.data_formatter (value, col_info_item)
  else
    return format_data_default (value, col_info_item);
}

/**
 * Generates a default string representation of a data value using column info.
 */
function format_data_default (value, col_info_item)
{
  if (value === null || value === undefined)
    return value;

  if (col_info_item)
    {
      switch (col_info_item.data_type)
      {
        case "js_date":
          return gsa.date_format (value)
        case "js_datetime":
          return gsa.datetime_format (value)
        case "unix_time":
          return gsa.datetime_format (new Date (value * 1000));
        case "cvss":
          return value.toFixed (1);
        case "decimal":
          return value.toFixed(3).replace(/([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/,'$1')
        default:
          return String (value);
      }
    }
  else
    {
      return String (value);
    }
}


/*
 * Record set transformation functions
 */

/*
 * Dummy function returning the raw data
 */
function data_raw (data)
{
  return data;
}

/*
 * Transform data into a top 10 list.
 */
function data_top_list (old_data, params)
{
  var new_data = { original_xml : old_data.original_xml,
                   records : [],
                   column_info : old_data.column_info,
                   filter_info : old_data.filter_info }

  var y_field = params.y_fields[0];
  if (y_field == null)
    y_field = "count";

  // Take only top 10 records with non-zero y field
  var top_count = 10;
  for (var i in old_data.records)
    {
      if (top_count)
        {
          if (old_data.records [i][y_field] > 0)
            {
              top_count --;
              new_data.records.push (old_data.records [i]);
            }
        }
      else
        break;
    }

  return new_data;
}

/*
 * Transform data into a severity histogram
 */
function data_severity_histogram (old_data, params)
{
  var bins = ["N/A", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
  var bins_long = ["N/A", "0.0", "0.1 - 1.0", "1.1 - 2.0", "2.1 - 3.0",
                   "3.1 - 4.0", "4.1 - 5.0", "5.1 - 6.0", "6.1 - 7.0",
                   "7.1 - 8.0", "8.1 - 9.0", "9.1 - 10.0"];
  var severity_field = "value";
  var count_field = "count";

  if (params)
    {
      if (params.severity_field)
        severity_field = params.severity_field;
      if (params.count_field)
        count_field = params.count_field;
    }

  var column_info = { group_columns : [severity_field],
                      data_columns : [count_field],
                      columns : {} }

  var bin_func = function (val)
    {
      if (val !== "" && Number (val) <= 0.0)
        return 1;
      else if (Number (val) >= 10.0)
        return 11;
      else if (Number (val) > 0.0)
        return Math.ceil (Number (val)) + 1;
      else
        return 0;
    };

  var records = bins.map (function (d)
                            {
                              var record = {};
                              record [severity_field] = d;
                              record [count_field] = 0;
                              return record;
                            });

  column_info.columns [severity_field]
    = {
        name : severity_field,
        type : old_data.column_info.columns [severity_field].type,
        column : old_data.column_info.columns [severity_field].column,
        stat : old_data.column_info.columns [severity_field].stat,
        data_type : "text"
      }

  column_info.columns [count_field]
    = {
        name : count_field,
        type : old_data.column_info.columns [count_field].type,
        column : "",
        stat : "count",
        data_type : "integer"
      }

  for (var i in old_data.records)
    {
      records[bin_func (old_data.records [i][severity_field])][count_field]
                     = Number(records[bin_func (old_data.records [i][severity_field])][count_field])
                       + Number(old_data.records[i][count_field]);
    };

  for (var i in records)
    {
      records[i][severity_field + "~long"] = bins_long [i]
    }

  var data = {
              original_xml : old_data.original_xml,
              records : records,
              column_info : column_info,
              filter_info : old_data.filter_info
             };

  return data;
}

/*
 * Gets the counts of severity levels from records containing the counts
 * the counts for each numeric CVSS score.
 */
function data_severity_level_counts (old_data, params)
{
  var bins = ["N/A", "Log", "Low", "Medium", "High"]
  var bins_long = ["N/A",
                   "Log (0.0 - "
                   + gsa.severity_levels.max_log.toFixed (1) + ")",
                   "Low ("
                   + gsa.severity_levels.min_low.toFixed (1)
                   + " - " + gsa.severity_levels.max_low.toFixed (1) + ")",
                   "Medium ("
                   + gsa.severity_levels.min_medium.toFixed (1)
                   + " - " + gsa.severity_levels.max_medium.toFixed (1) + ")",
                   "High ("
                   + gsa.severity_levels.min_high.toFixed (1)
                   + " - " + gsa.severity_levels.max_high.toFixed (1) + ")"];
  var severity_field = "value";
  var count_field = "count";
  var ascending = false;

  if (params)
    {
      if (params.severity_field)
        severity_field = params.severity_field;
      if (params.count_field)
        count_field = params.count_field;
      if (params.ascending != undefined)
        ascending = params.ascending;
    }

  var records = bins.map (function (d)
                            {
                              var record = {};
                              record [severity_field] = d;
                              record [count_field] = 0;
                              return record;
                            });

  var column_info = { group_columns : [severity_field],
                      data_columns : [count_field],
                      columns : {} }

  column_info.columns [severity_field]
    = {
        name : severity_field,
        type : old_data.column_info.columns [severity_field].type,
        column : old_data.column_info.columns [severity_field].column,
        stat : old_data.column_info.columns [severity_field].stat,
        data_type : "text"
      }

  column_info.columns [count_field]
    = {
        name : count_field,
        type : old_data.column_info.columns [count_field].type,
        column : "",
        stat : "count",
        data_type : "integer"
      }

  for (var i in old_data.records)
    {
      var val = old_data.records [i][severity_field];
      var count = old_data.records [i][count_field];

      if (val !== "" && Number (val) <= gsa.severity_levels.max_log)
        records[1][count_field] += count;
      else if (Number (val) >= gsa.severity_levels.min_low && Number (val) <= gsa.severity_levels.max_low)
        records[2][count_field] += count;
      else if (Number (val) >= gsa.severity_levels.min_medium && Number (val) <= gsa.severity_levels.max_medium)
        records[3][count_field] += count;
      else if (Number (val) >= gsa.severity_levels.min_high)
        records[4][count_field] += count;
      else
        records[0][count_field] += count;
    };

  for (var i in records)
    {
      records [i][severity_field + "~long"] = bins_long [i]
    }

  if (gsa.severity_levels.min_high == gsa.severity_levels.max_medium)
    delete records[4];
  if (gsa.severity_levels.min_medium == gsa.severity_levels.max_low)
    delete records[3];
  if (gsa.severity_levels.min_low == gsa.severity_levels.max_log)
    delete records[2];

  var data = {
              original_xml : old_data.original_xml,
              records : ascending ? records : records.reverse (),
              column_info : column_info,
              filter_info : old_data.filter_info
             };

  return data;
}

/**
 * Get counts by resource type, using the full type name for the x field.
 */
function resource_type_counts (old_data, params)
{
  var new_data = { original_xml : old_data.original_xml,
                   records : [],
                   column_info : old_data.column_info,
                   filter_info : old_data.filter_info };

  var type_field = "value";
  if (params)
    {
      if (params.type_field != null)
        type_field = params.type_field;
    }

  for (var record in old_data.records)
    {
      var new_record = {};
      for (field in old_data.records [record])
        {
          if (field == type_field)
            new_record[field] = resource_type_name_plural (old_data.records [record][field]);
          else
            new_record[field] = old_data.records [record][field];
        }
      new_data.records.push (new_record);
    }
  return new_data;
}

/**
 * Get counts by qod type, using the full type name for the x field.
 */
function qod_type_counts (old_data, params)
{
  var new_data = { original_xml : old_data.original_xml,
                   records : [],
                   column_info : old_data.column_info,
                   filter_info : old_data.filter_info };

  var type_field = "value";
  if (params)
    {
      if (params.type_field != null)
        type_field = params.type_field;
    }

  for (var record in old_data.records)
    {
      var new_record = {};
      for (field in old_data.records [record])
        {
          if (field == type_field)
            switch (old_data.records [record][field])
              {
                case (""):
                  new_record[field] = "None";
                  break;
                case ("exploit"):
                  new_record[field] = "Exploit";
                  break;
                case ("remote_vul"):
                  new_record[field] = "Remote vulnerability";
                  break;
                case ("package"):
                  new_record[field] = "Package check";
                  break;
                case ("registry"):
                  new_record[field] = "Registry check";
                  break;
                case ("executable_version"):
                  new_record[field] = "Executable version";
                  break;
                case ("remote_analysis"):
                  new_record[field] = "Remote analysis";
                  break;
                case ("remote_probe"):
                  new_record[field] = "Remote probe";
                  break;
                case ("remote_banner_unreliable"):
                  new_record[field] = "Unreliable rem. banner";
                  break;
                case ("executable_version_unreliable"):
                  new_record[field] = "Unreliable exec. version";
                  break;
                default:
                  new_record[field] = resource_type_name (old_data.records [record][field]);
              }
          else
            new_record[field] = old_data.records [record][field];
        }
      new_data.records.push (new_record);
    }

  var sort_func
    = function (a, b)
        {
          return b.count - a.count;
        };

  new_data.records.sort (sort_func);
  return new_data;
}

/**
 * Get counts by qod type, using the full type name for the x field.
 */
function percentage_counts (old_data, params)
{
  var new_data = { original_xml : old_data.original_xml,
                   records : [],
                   column_info : old_data.column_info,
                   filter_info : old_data.filter_info };

  var type_field = "value";
  if (params)
    {
      if (params.type_field != null)
        type_field = params.type_field;
    }

  for (var record in old_data.records)
    {
      var new_record = {};
      for (var field in old_data.records[record])
        {
          new_record[field] = old_data.records[record][field];
        }
      new_data.records.push (new_record);
    }

  var sort_func
    = function (a, b)
        {
          return b[type_field] - a[type_field];
        };
  new_data.records.sort (sort_func);

  for (var record in new_data.records)
    {
      new_data.records[record][type_field]
        = new_data.records[record][type_field] + "%";
    }

  return new_data;
}

/**
 * Get counts by resource type, using the full type name for the x field.
 */
function fill_empty_fields (old_data, params)
{
  var new_data = { original_xml : old_data.original_xml,
                   records : [],
                   column_info : old_data.column_info,
                   filter_info : old_data.filter_info };

  empty_x_records = [];

  var x_field = "value";
  if (params)
    {
      if (params.type_field != null)
        type_field = params.type_field;
    }

  for (var record in old_data.records)
    {
      var new_record = {};
      var empty_x = false;
      for (field in old_data.records [record])
        {
          if (old_data.records [record][field])
            new_record[field] = old_data.records [record][field];
          else
            {
              switch (old_data.column_info.columns [field].data_type)
                {
                  case "integer":
                  case "decimal":
                  case "cvss":
                  case "unix_time":
                    new_record[field] = 0;
                    break;
                  case "js_time":
                    new_record[field] = new Date (0);
                    break;
                  default:
                    new_record[field] = "N/A";
                }

              if (field == x_field)
                empty_x = true;
            }
        }

      if (empty_x)
        empty_x_records.push (new_record);
      else
        new_data.records.push (new_record);
    }

  for (var record in empty_x_records)
    new_data.records.push (empty_x_records [record]);

  return new_data;
}


/*
 * Generic display helper functions
 */

/*
 * Prints an error to the console and shows it on the display of a chart.
 */
function output_error (chart, display_message, console_message, console_extra)
{
  if (undefined != console_message)
    console.error (console_message);
  if (undefined != console_extra)
    console.debug (console_extra);

  chart.display ().show_error (display_message);
}

/*
 * Opens a popup window for a detached chart
 */
function open_detached (url)
{
  var new_window = window.open (url, "", "width=460, height=340");
  new_window.fit_window = true;
  return false;
}

/*
 * Resize a detached chart window to fit the chart display, filter and footer
 */
function fit_detached_window (dashboard)
{
  console.debug (dashboard.elem ())
  var display_width = Number (dashboard.elem().scrollWidth);
  var display_height = Number (dashboard.elem().scrollHeight);
  var filter = d3.select ("#applied_filter");
  var footer = d3.select (".gsa_footer")
  var height_diff = this.outerHeight - this.innerHeight;
  var width_diff = this.outerWidth - this.innerWidth;

  this.resizeTo (display_width + width_diff + 24,
                  this.innerHeight)
  this.resizeTo (display_width + width_diff + 24,
                  20 + height_diff + display_height
                  + Number (filter.property ("scrollHeight"))
                  + Number (footer.property ("scrollHeight")))
}

/*
 * Resizes a chart display to fill the whole window
 */
function detached_chart_resize_listener (dashboard)
{
  return function ()
    {
      var window_width = window.innerWidth;
      var window_height = window.innerHeight;
      $(dashboard.elem())
          .height (window_height - (Number (d3.select (".gsa_footer")
                                            .property ("clientHeight"))
                                    + Number (d3.select ("#applied_filter")
                                                .property ("clientHeight"))
                                    + 20));
      dashboard.resized (true);
    }
}

/*
 * Wrap SVG text at a given width
 */
function wrap_text (text_selection, width)
{
  text_selection.each(function()
    {
      var text = d3.select(this);
      var words = text.text()
                        .match (/[^\s-]+[\s-]*/g)
                          .reverse();
      var current_word;
      var line = [];
      var line_number = 0;
      var line_height = 1.2; //em
      var x = text.attr ("x");
      var y = text.attr ("y");
      var dy = parseFloat (text.attr ("dy"));
      var tspan = text.text (null)
                      .append ("tspan")
                        .attr ("x", x)
                        .attr ("y", y)
      var word;
      while (word = words.pop ())
        {
          line.push (word);
          tspan.text(line.join (""));
          if (tspan.node ().getComputedTextLength () > width) {
            if (line.length > 1)
              {
                line.pop ();
                tspan.text (line.join (""));
                line = [word];
              }
            else
              {
                tspan.text (line.join (""));
                line.pop ();
              }

            tspan = text.append ("tspan")
                          .attr("x", x)
                          .attr("y", y)
                          .attr("dy", ++line_number * line_height + "em")
                          .text(line.join (""));
          }
        }
    });
}


/*
 * Generic chart title generators
 */

/*
 * Returns a static title
 */
function title_static (loading_text, loaded_text)
{
  return function (data)
    {
      if (typeof data === 'undefined')
        return loading_text;
      else
        return loaded_text;
    }
}

/*
 * Returns a title containing the total count of the resources.
 */
function title_total (title, count_field)
{
  return function (data)
    {
      var filter_text = "";

      if (data != null
          && data.filter_info != null
          && data.filter_info.name != "")
        filter_text = ": " + data.filter_info.name;

      if (typeof data === 'undefined')
        return title + " (Loading...)";

      var total = 0;
      for (var i = 0; i < data.records.length; i++)
        total = Number(total) + Number(data.records[i][count_field]);
      return (title + filter_text + " (Total: " + String(total) + ")");
    }
}

/*
 * Generic chart styling helpers
 */

/* Color scales */

/*
 * Color scale for SecInfo severity levels
 */
severity_level_color_scale
  = d3.scale.ordinal ()
              .range (["silver", "#DDDDDD", "skyblue", "orange", "#D80000"])
              .domain (["N/A", "Log", "Low", "Medium", "High"]);

/*
 * Severity gradient
 */
severity_colors_gradient = function ()
{
  return d3.scale.linear()
            .domain([-1.0,
                      gsa.severity_levels.max_log,
                      gsa.severity_levels.max_low,
                      gsa.severity_levels.max_medium,
                      10.0])
            .range([d3.rgb ("grey"),
                    d3.rgb ("silver"),
                    d3.rgb ("skyblue"),
                    d3.rgb ("orange"),
                    d3.rgb ("red")]);
}


/*
 * Data export helpers
 */

/*
 * Generate CSV data from simple records
 */
csv_from_records = function (records, column_info, columns, headers, title)
{
  var csv_data = "";

  if (title != undefined)
    csv_data += (title + "\r\n");

  if (headers != undefined)
    {
      for (var col_i in headers)
        {
          csv_data += "\"" + String (headers[col_i]).replace ("\"", "\"\"") + "\"";
          if (col_i < columns.length - 1)
            csv_data += ",";
        }
      csv_data += "\r\n";
    }

  for (var row in records)
    {
      for (var col_i in columns)
        {
          var col = columns [col_i];
          if (records [row][col] != null)
            csv_data += "\""
                        + format_data (records [row][col],
                                        column_info.columns [col])
                              .replace ("\"", "\"\"")
                        + "\"";
          else
            csv_data += "\"\"";

          if (col_i < columns.length - 1)
            csv_data += ",";
        }
      csv_data += "\r\n";
    }

  return csv_data;
}

/*
 * Generate HTML table from simple records
 */
html_table_from_records = function (records, column_info, columns,
                                    headers, title, filter)
{
  var csv_data = "";

  var doc = document.implementation.createDocument ("http://www.w3.org/1999/xhtml", "html", null);
  var head_s = d3.select (doc.documentElement).append ("head");
  var body_s = d3.select (doc.documentElement).append ("body");
  var table_s;
  var row_class = "odd";

  var stylesheet;
  for (var sheet_i = 0; stylesheet == undefined && sheet_i < document.styleSheets.length; sheet_i++)
    {
      if (document.styleSheets [sheet_i].href.indexOf("/gsa-style.css", document.styleSheets [sheet_i].href.length - "/gsa-style.css".length) !== -1 )
        stylesheet = document.styleSheets [sheet_i];
    }

  head_s.append ("title")
          .text ("Greenbone Security Assistant - Chart data table")

  head_s.append ("link")
          .attr ("href", stylesheet.href)
          .attr ("type", "text/css")
          .attr ("rel", "stylesheet")

  body_s.style ("padding", "10px")

  table_s = body_s.append ("table")
                    .attr ("cellspacing", "2")
                    .attr ("cellpadding", "4")
                    .attr ("border", "0")
                    .attr ("class", "gbntable")

  table_s.append ("tr")
          .attr ("class", "gbntablehead1")
          .append ("td")
            .attr ("colspan", headers.length)
            .text (title)

  if (headers != undefined)
    {
      var tr_s = table_s.append ("tr")
                          .attr ("class", "gbntablehead2");
      for (var col_i in headers)
        {
          tr_s.append ("td")
                .text (headers[col_i])
        }
    }

  for (var row in records)
    {
      var tr_s = table_s.append ("tr")
                          .attr ("class", row_class);
      for (var col_i in columns)
        {
          var col = columns [col_i];
          tr_s.append ("td")
                .text (format_data (records [row][col],
                                    column_info.columns [col]))
        }
      row_class = (row_class == "odd") ? "even" : "odd";
    }

  if (filter != null)
    body_s.append ("p")
            .attr ("class", "footnote")
            .text ("Applied filter: " + filter);

  return doc.documentElement.outerHTML;
}

/*
 * Convert SVG element to export format
 */
svg_from_elem = function (svg_elem, title)
{
  var css_text = "";
  // find stylesheet
  /*
   * FIXME: Consider moving chart styles to extra CSS file to reduce SVG size.
   *        Axes are only shown correctly in programs more "dedicated" to SVG
   *         like browsers and Inkscape: Lines with ticks become black boxes
   *         elsewhere. Workaround: Save copy as "plain SVG" in Inkscape.
   */
  var stylesheet;

  var width = Number (svg_elem.attr ("width"));
  var height = Number (svg_elem.attr ("height"));

  for (var sheet_i = 0; stylesheet == undefined && sheet_i < document.styleSheets.length; sheet_i++)
    {
      if (document.styleSheets [sheet_i].href.indexOf("/gsa-style.css", document.styleSheets [sheet_i].href.length - "/gsa-style.css".length) !== -1 )
        stylesheet = document.styleSheets [sheet_i];
    }
  // get stylesheet text
  var css_text = "";
  for (var i = 0; i < stylesheet.cssRules.length; i++)
    {
      css_text += stylesheet.cssRules[i].cssText;
    }

  var title_xml;
  if (title != null && title != "")
    title_xml =   "<text x=\"" + (width/2) + "\" y=\"0\""
                + " text-anchor=\"middle\""
                + " style=\"font-weight: bold; font-size: 12px\">"
                + title
                + "</text>"
  else
    title_xml = ""

  var svg_clone = d3.select (svg_elem.node().cloneNode(true));
  svg_clone.selectAll (".remove_on_static").remove ();

  var defs = svg_clone.selectAll ("defs");
  if (defs.empty ())
    defs = svg_clone.insert ("defs", ":first-child");

  defs.insert ("style")
        .attr ("type", "text/css")
        .html (css_text)

  // create SVG
  var svg_data =  "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
                  + "<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.0//EN\" \"http://www.w3.org/TR/SVG/DTD/svg10.dtd\"> "
                  + "<svg xmlns=\"http://www.w3.org/2000/svg\""
                  + " viewBox=\"0 " + (title != null ? "-14" : "0") + " " + width + " " + height + "\""
                  + " width=\"" + width + "\""
                  + " height=\"" + (height + (title != null ? 14 : 0)) + "\">"
                  + svg_clone.html ()
                  + title_xml
                  + "</svg>";
  return svg_data;
}

/*
 * Shows a blob url inside an img element in a new window.
 */
function blob_img_window (blob_url)
{
  var new_window = window.open ("", "_blank");

  d3.select (new_window.document)
      .select ("body")
        .insert ("img")
          .attr ("src", blob_url)
  return;
}
