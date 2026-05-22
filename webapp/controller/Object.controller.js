sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History"
], (Controller, History) => {
    "use strict";

    return Controller.extend("bagemini.controller.Object", {
        onInit() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteObject").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function (oEvent) {
            var sInvoiceId = oEvent.getParameter("arguments").InvoiceId;
            this.getView().bindElement({
                path: "/Invoices('" + sInvoiceId + "')"
            });
        },

        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            // Falls wir aus der App navigiert sind -> einen Schritt zurück
            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                // Fallback: Manuell zur Listenansicht navigieren, wenn App direkt über Bookmark aufgerufen wurde
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("RouteView1", {}, true);
            }
        }
    });
});