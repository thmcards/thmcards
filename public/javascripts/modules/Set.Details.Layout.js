Cards.module('Set.Details', function(Details, App) {
	Details.Layout = Backbone.Marionette.Layout.extend({
		template: "#set-details-layout",
		regions: {
			detailsRegion: "#set-details-region",
			sideBarRegion: "#set-details-sideBar-region",
			controlsRegion: "#set-details-controls-region",
		}
	});
	Details.NewCardLayout = Backbone.Marionette.Layout.extend({
		template: "#set-details-newcard-layout",
		regions: {
			detailsRegion: "#set-newcard-region",
		}
	});
});