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

        onAddItem: function () {
            var oView = this.getView();
            var oContext = oView.getBindingContext();
            var sInvoiceId = oContext.getProperty("InvoiceId");
            
            var sItemId = "ITEM_" + new Date().getTime();

            var oNewItemData = {
                ItemId: sItemId,
                InvoiceId: sInvoiceId,
                Description: "",
                Quantity: "1.000",
                UnitPrice: "0.00",
                TaxRate: "19.00",
                TaxCode: "V1",
                NetAmount: "0.00",
                TaxAmount: "0.00",
                GrossAmount: "0.00"
            };

            var oTable = oView.byId("invoiceItemsTable");
            var oBinding = oTable.getBinding("items");
            
            // Add the new row directly to the table binding at the end
            oBinding.create(oNewItemData, true);
            
            this._recalculateTotals();
        },

        onItemChange: function (oEvent) {
            var oItemContext = oEvent.getSource().getBindingContext();
            var oModel = oItemContext.getModel();
            
            var fQuantity = parseFloat(oItemContext.getProperty("Quantity") || 0);
            var fUnitPrice = parseFloat(oItemContext.getProperty("UnitPrice") || 0);
            var fTaxRate = parseFloat(oItemContext.getProperty("TaxRate") || 0);
            
            var fNetAmount = fQuantity * fUnitPrice;
            var fTaxAmount = fNetAmount * (fTaxRate / 100);
            var fGrossAmount = fNetAmount + fTaxAmount;
            
            oModel.setProperty("NetAmount", fNetAmount.toFixed(2), oItemContext);
            oModel.setProperty("TaxAmount", fTaxAmount.toFixed(2), oItemContext);
            oModel.setProperty("GrossAmount", fGrossAmount.toFixed(2), oItemContext);
            
            this._recalculateTotals();
        },

        _recalculateTotals: function () {
            var oView = this.getView();
            var oContext = oView.getBindingContext();
            var oModel = oContext.getModel();
            
            var oTable = oView.byId("invoiceItemsTable");
            var oBinding = oTable.getBinding("items");
            
            if (!oBinding) {
                return;
            }

            var aContexts = oBinding.getContexts();
            
            var fTotalNet = 0;
            var fTotalGross = 0;

            aContexts.forEach(function (oItemContext) {
                fTotalNet += parseFloat(oItemContext.getProperty("NetAmount") || 0);
                fTotalGross += parseFloat(oItemContext.getProperty("GrossAmount") || 0);
            });
            
            oModel.setProperty("NetAmount", fTotalNet.toFixed(2), oContext);
            oModel.setProperty("GrossAmount", fTotalGross.toFixed(2), oContext);
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