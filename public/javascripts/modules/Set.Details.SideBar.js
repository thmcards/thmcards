Cards.module("Set.Details.SideBar", function(SideBar, App) {
	SideBar.SideBarView = Backbone.Marionette.ItemView.extend({
		template: "#set-details-sideBar",
		className: "well sidebar-nav",
		ui: {

		},
		events: {
			"click a": "linkClicked"
		},
		linkClicked : function(ev) {
			ev.preventDefault();

			console.log(this.model);
		}
	});
});