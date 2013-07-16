Cards.module('Set.Details', function(Details, App) {
	Details.Layout = Backbone.Marionette.Layout.extend({
		template: "#set-details-layout",
		regions: {
			detailsRegion: "#set-details-region",
			sideBarRegion: "#set-details-sideBar-region"
		}
	});
	Details.NewCardLayout = Backbone.Marionette.Layout.extend({
		template: "#set-details-newcard-layout",
		regions: {
			detailsRegion: "#set-newcard-region",
		}
	});
});