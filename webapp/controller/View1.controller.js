sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel"
], (Controller, Filter, FilterOperator, Fragment, MessageBox, MessageToast, JSONModel) => {
    "use strict";

    return Controller.extend("bagemini.controller.View1", {
        onInit: function () {
            var oChartModel = new JSONModel({ Data: [] });
            this.getView().setModel(oChartModel, "chartModel");
        },

        onTableUpdateFinished: function (oEvent) {
            this._updateChartData();
        },

        _updateChartData: function () {
            var oTable = this.byId("invoiceTable");
            var oBinding = oTable.getBinding("items");
            if (!oBinding) {
                return;
            }

            var aContexts = oBinding.getCurrentContexts();
            var oCounts = {};

            aContexts.forEach(function (oContext) {
                var oInvoice = oContext.getObject();
                if (oInvoice && oInvoice.InvoiceDate) {
                    var oDate = new Date(oInvoice.InvoiceDate);
                    var sMonth = oDate.getFullYear() + "-" + ("0" + (oDate.getMonth() + 1)).slice(-2);
                    oCounts[sMonth] = (oCounts[sMonth] || 0) + 1;
                }
            });

            var aData = Object.keys(oCounts).map(function (sMonth) {
                return { Month: sMonth, Count: oCounts[sMonth] };
            });

            aData.sort(function(a, b) {
                return a.Month.localeCompare(b.Month);
            });

            this.getView().getModel("chartModel").setProperty("/Data", aData);
        },

        onCreateInvoicePress: function () {
            var oView = this.getView();
            if (!this.byId("createInvoiceDialog")) {
                Fragment.load({
                    id: oView.getId(),
                    name: "bagemini.view.CreateInvoiceDialog",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    this._resetCreateForm();
                    oDialog.open();
                }.bind(this));
            } else {
                this._resetCreateForm();
                this.byId("createInvoiceDialog").open();
            }
        },

        _resetCreateForm: function() {
            this.byId("newInvoiceNumber").setValue("");
            this.byId("newInvoiceNumber").setValueState("None");
            this.byId("newVendorName").setValue("");
            this.byId("newVendorName").setValueState("None");
            this.byId("newInvoiceDate").setDateValue(null);
            this.byId("newInvoiceDate").setValueState("None");
            this.byId("newCurrency").setValue("");
            this.byId("newCurrency").setValueState("None");
            this.byId("newDueDate").setDateValue(null);
        },

        onCreateInvoiceSave: function () {
            var oInvoiceNumber = this.byId("newInvoiceNumber");
            var oVendorName = this.byId("newVendorName");
            var oInvoiceDate = this.byId("newInvoiceDate");
            var oCurrency = this.byId("newCurrency");
            var oDueDate = this.byId("newDueDate");

            var bValid = true;

            if (!oInvoiceNumber.getValue()) {
                bValid = false;
                oInvoiceNumber.setValueState("Error");
            } else {
                oInvoiceNumber.setValueState("None");
            }

            if (!oVendorName.getValue()) {
                bValid = false;
                oVendorName.setValueState("Error");
            } else {
                oVendorName.setValueState("None");
            }

            if (!oInvoiceDate.getDateValue()) {
                bValid = false;
                oInvoiceDate.setValueState("Error");
            } else {
                oInvoiceDate.setValueState("None");
            }

            if (!oCurrency.getValue()) {
                bValid = false;
                oCurrency.setValueState("Error");
            } else {
                oCurrency.setValueState("None");
            }

            if (!bValid) {
                var sErrorMsg = this.getView().getModel("i18n").getResourceBundle().getText("errorMandatoryFields");
                MessageBox.error(sErrorMsg);
                return;
            }

            var sInvoiceId = "INV" + Date.now().toString();

            var oPayload = {
                InvoiceId: sInvoiceId,
                InvoiceNumber: oInvoiceNumber.getValue(),
                VendorName: oVendorName.getValue(),
                InvoiceDate: oInvoiceDate.getDateValue(),
                Currency: oCurrency.getValue().toUpperCase(),
                Status: "Draft",
                NetAmount: "0.00",
                GrossAmount: "0.00"
            };

            var dDueDate = oDueDate.getDateValue();
            if (dDueDate) {
                oPayload.DueDate = dDueDate;
            }

            var oModel = this.getView().getModel();
            oModel.create("/Invoices", oPayload, {
                success: function () {
                    var sSuccessMsg = this.getView().getModel("i18n").getResourceBundle().getText("btnSave") + " erfolgreich";
                    MessageToast.show(sSuccessMsg);
                    this.byId("createInvoiceDialog").close();
                    this.byId("invoiceTable").getBinding("items").refresh();
                }.bind(this),
                error: function () {
                    MessageBox.error("Fehler beim Erstellen der Rechnung");
                }
            });
        },

        onCreateInvoiceCancel: function () {
            this.byId("createInvoiceDialog").close();
        },

        onListItemPress: function (oEvent) {
            var bSelected = oEvent.getParameter("selected");
            // Skip processing if the event was triggered by an item being unselected
            if (bSelected === false) {
                return;
            }
            
            var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
            var oContext = oItem.getBindingContext();
            if (!oContext) {
                return;
            }
            
            var sInvoiceId = oContext.getProperty("InvoiceId");
            if (!sInvoiceId) {
                sap.m.MessageBox.error("Fehler: InvoiceId konnte nicht aus dem Kontext gelesen werden.");
                return;
            }
            
            var oTable = this.byId("invoiceTable");
            if (oTable) {
                oTable.removeSelections(true);
            }
            
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteObject", {
                InvoiceId: sInvoiceId
            });
        }
    });
});