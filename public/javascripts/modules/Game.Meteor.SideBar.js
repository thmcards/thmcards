Cards.module("Game.Meteor.SideBar", function(SideBar, App) {
	SideBar.SideBarView = Backbone.Marionette.ItemView.extend({
		template: "#game-meteor-sideBar",
		className: "well well-sm sidebar-nav",
		ui: {

		}
	})
});