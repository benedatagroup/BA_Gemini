sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel"
], (BaseController, JSONModel) => {
  "use strict";

  return BaseController.extend("bagemini.controller.App", {
      onInit() {
          var oViewModel = new JSONModel({
              layout: "OneColumn"
          });
          this.getView().setModel(oViewModel, "appView");

          var oRouter = this.getOwnerComponent().getRouter();
          oRouter.attachRouteMatched(this.onRouteMatched, this);
      },

      onRouteMatched: function (oEvent) {
          var sRouteName = oEvent.getParameter("name");
          var oViewModel = this.getView().getModel("appView");

          if (sRouteName === "RouteView1") {
              oViewModel.setProperty("/layout", "OneColumn");
          } else if (sRouteName === "RouteObject") {
              oViewModel.setProperty("/layout", "TwoColumnsMidExpanded");
          }
      }
  });
});