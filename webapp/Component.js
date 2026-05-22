sap.ui.define([
    "sap/ui/core/UIComponent",
    "bagemini/model/models",
    "bagemini/localService/mockserver"
], (UIComponent, models, mockserver) => {
    "use strict";

    // initialize the mock server before the component is instantiated
    mockserver.init();

    return UIComponent.extend("bagemini.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // enable routing
            this.getRouter().initialize();
        }
    });
});