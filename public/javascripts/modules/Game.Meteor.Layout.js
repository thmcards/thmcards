Cards.module('Game.Meteor', function(Meteor, App) {
	Meteor.Layout = Backbone.Marionette.Layout.extend({
		template: "#game-meteor-layout",
		regions: {
			sideBarRegion: "#game-meteor-sideBar-region",
			pitchRegion: "#game-meteor-pitch-region"
		},
		onRender: function(){
			i18ninit();
		}
	});
});
