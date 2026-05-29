sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
], (Controller, History, JSONModel, MessageBox) => {
    "use strict";

    return Controller.extend("bagemini.controller.Object", {
        onInit() {
            var oViewModel = new JSONModel({
                editMode: false
            });
            this.getView().setModel(oViewModel, "objectView");

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteObject").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function (oEvent) {
            this.getView().getModel("objectView").setProperty("/editMode", false);
            
            var sInvoiceId = oEvent.getParameter("arguments").InvoiceId;
            this.getView().bindElement({
                path: "/Invoices('" + sInvoiceId + "')"
            });
        },

        onNavBack: function () {
            if (this.getView().getModel("objectView").getProperty("/editMode")) {
                this.getView().getModel().resetChanges();
                this.getView().getModel("objectView").setProperty("/editMode", false);
            }

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
        },

        onEdit: function () {
            this.getView().getModel("objectView").setProperty("/editMode", true);
        },

        onCancel: function () {
            this.getView().getModel().resetChanges();
            this.getView().getModel("objectView").setProperty("/editMode", false);
        },

        onSave: function () {
            var oView = this.getView();
            var oContext = oView.getBindingContext();
            var oData = oContext.getObject();
            var oResourceBundle = oView.getModel("i18n").getResourceBundle();
            
            // Validation
            if (!oData.VendorName || oData.VendorName.trim() === "") {
                MessageBox.error(oResourceBundle.getText("errorVendorNameEmpty"));
                return;
            }
            if (!oData.Currency || oData.Currency.trim() === "") {
                MessageBox.error(oResourceBundle.getText("errorCurrencyEmpty"));
                return;
            }
            if (oData.DueDate) {
                var oToday = new Date();
                oToday.setHours(0, 0, 0, 0);
                if (oData.DueDate.getTime() < oToday.getTime()) {
                    MessageBox.error(oResourceBundle.getText("errorDueDatePast"));
                    return;
                }
            }

            var oModel = oView.getModel();
            if (oModel.hasPendingChanges()) {
                oModel.submitChanges({
                    success: function () {
                        oView.getModel("objectView").setProperty("/editMode", false);
                    },
                    error: function () {
                        MessageBox.error("Fehler beim Speichern der Daten.");
                    }
                });
            } else {
                oView.getModel("objectView").setProperty("/editMode", false);
            }
        }
    });
});