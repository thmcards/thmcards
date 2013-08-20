Cards.module("Profile.SideBar", function(SideBar, App) {
	SideBar.SideBarView = Backbone.Marionette.ItemView.extend({
		template: "#profile-sideBar",
		className: "well sidebar-nav",
		ui: {

		},
		events: {
		}
	});
});