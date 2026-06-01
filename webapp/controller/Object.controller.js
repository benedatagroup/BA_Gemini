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
                path: "/Invoices('" + sInvoiceId + "')",
                events: {
                    dataReceived: function () {
                        var oTable = this.getView().byId("invoiceItemsTable");
                        var oBinding = oTable.getBinding("items");
                        if (oBinding && !this._bBindingAttached) {
                            oBinding.attachDataReceived(this._onTableDataReceived, this);
                            this._bBindingAttached = true;
                        }
                    }.bind(this)
                }
            });
        },

        _onTableDataReceived: function () {
            this._recalculateTotals();
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
            var oModel = oContext.getModel();
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

            try {
                oModel.createEntry("InvoiceItems", {
                    context: oContext,
                    properties: oNewItemData
                });
                
                this._recalculateTotals();
            } catch (e) {
                MessageBox.error("Fehler beim Hinzufügen der Position: " + e.message);
            }
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
            var oTaxGroups = {};

            aContexts.forEach(function (oItemContext) {
                if (!oItemContext) {
                    return;
                }
                var fNet = parseFloat(oItemContext.getProperty("NetAmount") || 0);
                var fGross = parseFloat(oItemContext.getProperty("GrossAmount") || 0);
                var sTaxRate = oItemContext.getProperty("TaxRate");
                var fTaxRate = parseFloat(sTaxRate || 0);
                
                fTotalNet += fNet;
                fTotalGross += fGross;
                
                if (sTaxRate !== undefined && sTaxRate !== null && sTaxRate !== "") {
                    var sKey = fTaxRate.toFixed(2);
                    if (!oTaxGroups[sKey]) {
                        oTaxGroups[sKey] = { taxBase: 0, taxAmount: 0 };
                    }
                    oTaxGroups[sKey].taxBase += fNet;
                }
            });
            
            Object.keys(oTaxGroups).forEach(function(sRateKey) {
                var fTaxRate = parseFloat(sRateKey);
                oTaxGroups[sRateKey].taxAmount = oTaxGroups[sRateKey].taxBase * (fTaxRate / 100);
            });
            
            oModel.setProperty("NetAmount", fTotalNet.toFixed(2), oContext);
            oModel.setProperty("GrossAmount", fTotalGross.toFixed(2), oContext);

            var oTaxTable = oView.byId("taxItemsTable");
            if (oTaxTable) {
                var oTaxBinding = oTaxTable.getBinding("items");
                if (oTaxBinding) {
                    var aTaxContexts = oTaxBinding.getContexts();
                    var oProcessedRates = {};
                    
                    aTaxContexts.forEach(function(oTaxContext) {
                        if (!oTaxContext) {
                            return;
                        }
                        var sCurrentRateKey = parseFloat(oTaxContext.getProperty("TaxRate") || 0).toFixed(2);
                        if (oTaxGroups[sCurrentRateKey]) {
                            oModel.setProperty("TaxBase", oTaxGroups[sCurrentRateKey].taxBase.toFixed(2), oTaxContext);
                            oModel.setProperty("TaxAmount", oTaxGroups[sCurrentRateKey].taxAmount.toFixed(2), oTaxContext);
                            oProcessedRates[sCurrentRateKey] = true;
                        } else {
                            var sTaxPath = oTaxContext.getPath();
                            var bIsTaxTransient = oTaxContext.bCreated || (oTaxContext.isTransient && oTaxContext.isTransient()) || sTaxPath.indexOf("id-") !== -1 || sTaxPath.indexOf("TAX_") !== -1;
                            if (bIsTaxTransient) {
                                if (oModel.deleteCreatedEntry) {
                                    oModel.deleteCreatedEntry(oTaxContext);
                                } else {
                                    oModel.resetChanges([sTaxPath]);
                                }
                            } else {
                                oModel.remove(sTaxPath, {
                                    success: function() {},
                                    error: function() {}
                                });
                            }
                        }
                    });
                    
                    Object.keys(oTaxGroups).forEach(function(sRateKeyToCreate) {
                        if (!oProcessedRates[sRateKeyToCreate]) {
                            var sTaxItemId = "TAX_" + new Date().getTime() + "_" + Math.floor(Math.random() * 1000);
                            try {
                                oModel.createEntry("TaxItems", {
                                    context: oContext,
                                    properties: {
                                        TaxItemId: sTaxItemId,
                                        InvoiceId: oContext.getProperty("InvoiceId"),
                                        TaxRate: parseFloat(sRateKeyToCreate).toFixed(2),
                                        TaxBase: oTaxGroups[sRateKeyToCreate].taxBase.toFixed(2),
                                        TaxAmount: oTaxGroups[sRateKeyToCreate].taxAmount.toFixed(2)
                                    }
                                });
                            } catch(e) {
                                console.error("Error creating TaxItem:", e);
                            }
                        }
                    });
                }
            }
        },

        onDeleteItem: function (oEvent) {
            var oItem = oEvent.getParameter("listItem");
            var oItemContext = oItem.getBindingContext();
            var oModel = oItemContext.getModel();
            
            var sPath = oItemContext.getPath();
            var bIsTransient = oItemContext.bCreated || 
                               (oItemContext.isTransient && oItemContext.isTransient()) || 
                               sPath.indexOf("id-") !== -1 || 
                               sPath.indexOf("TAX_") !== -1 || 
                               sPath.indexOf("ITEM_") !== -1;

            if (bIsTransient) {
                if (oModel.deleteCreatedEntry) {
                    oModel.deleteCreatedEntry(oItemContext);
                } else {
                    oModel.resetChanges([sPath]);
                }
                this._recalculateTotals();
            } else {
                oModel.remove(sPath, {
                    success: function() {
                        // Binding change will trigger dataReceived which recalculates totals
                    }.bind(this),
                    error: function() {
                        MessageBox.error("Fehler beim Löschen der Position.");
                    }
                });
            }
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