Cards.module("Set.Learn.SideBar", function(SideBar, App) {
	SideBar.SideBarView = Backbone.Marionette.ItemView.extend({
		template: "#set-learn-sideBar",
		className: "well well-sm sidebar-nav",
		ui: {

		}
	}),
	SideBar.ControlsView = Backbone.Marionette.ItemView.extend({
		template: "#set-learn-controls",
		className: "well well-sm sidebar-nav",
		ui: {

		},
		events: {
			"click a": "linkClicked",
			"click .learn-box": "boxChoosen"
		},
		initialize: function() {
			console.log(this.collection);
		},
		boxChoosen: function(ev) {
			console.log(ev.target.id); //id aus event ziehen
			//enstprechende karten in learn-region laden

			var bla = ev.target.id;

			if(bla == 1) {
				// HIER MAL WAS VERNÜNFTIGES REIN WONACH GEFILTERT WIRD
				App.trigger("filter:box", { test: "666"});
			} else {
				// ANSONSTEN ZEIGE WIEDER ALLE
				App.trigger("filter:box", null);
			}
		},
		linkClicked : function(ev) {
			ev.preventDefault();

			console.log(this.model);
		}
	});
});