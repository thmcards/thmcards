Cards.module("Set.Learn.SideBar", function(SideBar, App) {
	SideBar.SideBarView = Backbone.Marionette.ItemView.extend({
		template: "#set-learn-sideBar",
		className: "well sidebar-nav",
		ui: {

		}
	}),
	SideBar.ControlsView = Backbone.Marionette.ItemView.extend({
		template: "#set-learn-controls",
		className: "well sidebar-nav",
		ui: {

		},
		events: {
			"click a": "linkClicked",
			"click .btn-primary": "newCardClicked"
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