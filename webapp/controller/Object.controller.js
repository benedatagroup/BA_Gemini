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
                editMode: false,
                noteText: "",
                originalNoteText: "",
                noteExists: false
            });
            this.getView().setModel(oViewModel, "objectView");

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteObject").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function (oEvent) {
            var oViewModel = this.getView().getModel("objectView");
            oViewModel.setProperty("/editMode", false);
            oViewModel.setProperty("/noteText", "");
            oViewModel.setProperty("/originalNoteText", "");
            oViewModel.setProperty("/noteExists", false);
            
            var sInvoiceId = oEvent.getParameter("arguments").InvoiceId;
            var oModel = this.getOwnerComponent().getModel();
            
            var sNotePath = "/Notes('" + sInvoiceId + "')";
            oModel.read(sNotePath, {
                success: function(oData) {
                    oViewModel.setProperty("/noteText", oData.NoteText);
                    oViewModel.setProperty("/originalNoteText", oData.NoteText);
                    oViewModel.setProperty("/noteExists", true);
                },
                error: function() {
                    oViewModel.setProperty("/noteText", "");
                    oViewModel.setProperty("/originalNoteText", "");
                    oViewModel.setProperty("/noteExists", false);
                }
            });

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

        onClose: function () {
            if (this.getView().getModel("objectView").getProperty("/editMode")) {
                this.getView().getModel().resetChanges();
                this.getView().getModel("objectView").setProperty("/editMode", false);
            }

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteView1", {}, true); // Return to list view
        },

        onEdit: function () {
            this.getView().getModel("objectView").setProperty("/editMode", true);
        },

        onCancel: function () {
            var oViewModel = this.getView().getModel("objectView");
            this.getView().getModel().resetChanges();
            oViewModel.setProperty("/noteText", oViewModel.getProperty("/originalNoteText"));
            oViewModel.setProperty("/editMode", false);
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
                                MessageBox.error("Fehler beim Erstellen der Steuerposition: " + e.message);
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
                    },
                    error: function() {
                        MessageBox.error("Fehler beim Löschen der Position.");
                    }
                });
            }
        },

        onAfterItemAdded: function (oEvent) {
            var oItem = oEvent.getParameter("item");
            var oView = this.getView();
            var oContext = oView.getBindingContext();
            var oModel = oContext.getModel();
            var sInvoiceId = oContext.getProperty("InvoiceId");
            
            var sAttachmentId = "ATT_" + new Date().getTime();
            
            var sFileName = oItem.getFileName();
            var sMediaType = oItem.getMediaType() || "application/octet-stream";
            var sFileType = "UNKNOWN";
            if (sFileName) {
                var aParts = sFileName.split(".");
                if (aParts.length > 1) {
                    sFileType = aParts[aParts.length - 1].toUpperCase();
                }
            }
            

            var oNewAttachmentData = {
                AttachmentId: sAttachmentId,
                InvoiceId: sInvoiceId,
                FileName: sFileName,
                FileType: sFileType,
                FileSize: oItem.getFileObject() ? oItem.getFileObject().size : 0,
                MimeType: sMediaType
            };

            try {
                oModel.createEntry("Attachments", {
                    context: oContext,
                    properties: oNewAttachmentData
                });
            } catch (e) {
                MessageBox.error("Fehler beim Hinzufügen des Anhangs: " + e.message);
            }
        },

        onPost: function () {
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

            var oModel = oContext.getModel();
            oModel.setProperty("Status", "Posted", oContext);
            this.onSave();
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
            var oViewModel = oView.getModel("objectView");
            var sNoteText = oViewModel.getProperty("/noteText");
            var sOriginalNoteText = oViewModel.getProperty("/originalNoteText");
            var bNoteExists = oViewModel.getProperty("/noteExists");
            var sInvoiceId = oData.InvoiceId;

            if (sNoteText !== sOriginalNoteText) {
                if (bNoteExists) {
                    oModel.setProperty("/Notes('" + sInvoiceId + "')/NoteText", sNoteText);
                } else if (sNoteText && sNoteText.trim() !== "") {
                    oModel.createEntry("Notes", {
                        context: oContext,
                        properties: {
                            InvoiceId: sInvoiceId,
                            NoteText: sNoteText
                        }
                    });
                }
            }

            if (oModel.hasPendingChanges()) {
                oModel.submitChanges({
                    success: function () {
                        oViewModel.setProperty("/originalNoteText", sNoteText);
                        if (sNoteText && sNoteText.trim() !== "") {
                            oViewModel.setProperty("/noteExists", true);
                        }
                        oViewModel.setProperty("/editMode", false);
                    },
                    error: function () {
                        MessageBox.error("Fehler beim Speichern der Daten.");
                    }
                });
            } else {
                oViewModel.setProperty("/editMode", false);
            }
        }
    });
});