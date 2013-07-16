Cards.module("Set.Details.SideBar", function(SideBar, App) {
	SideBar.SideBarView = Backbone.Marionette.ItemView.extend({
		template: "#set-details-sideBar",
		className: "well sidebar-nav",
		ui: {

		},
		events: {
			"click a": "linkClicked",
			"click .btn-success": "newCardClicked"
		},
		newCardClicked: function(ev) {
			App.trigger("set:details:new", this.model.get("name").replace(/[^a-zA-Z0-9-_]/g, '_'), this.model.get("_id"));
		},
		linkClicked : function(ev) {
			ev.preventDefault();

			console.log(this.model);
		}
	});
});