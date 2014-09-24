Cards.module("Set.Memo.SideBar", function(SideBar, App) {
	SideBar.SideBarView = Backbone.Marionette.ItemView.extend({
		template: "#set-memo-sideBar",
		className: "well well-sm sidebar-nav",
		ui: {

		}
	}),
	SideBar.ControlsView = Backbone.Marionette.ItemView.extend({
		template: "#set-memo-controls",
		className: "well well-sm sidebar-nav",
		ui: {

		},
		events: {
			"click a": "linkClicked"
		},
		initialize: function() {
			console.log(this.collection);
		},
		linkClicked : function(ev) {
			ev.preventDefault();

			console.log(this.model);
		},
		onRender: function() {
			i18ninit();
		}
	});
});
