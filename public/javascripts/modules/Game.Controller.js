Cards.module('Game', function(Game, App){
	Game.Controller = {
		showMeteorLayout: function(id){

			var set = new Cards.Entities.Set({id: id});
			set.fetch({
				success: function(){
					var meteorLayout = new Cards.Game.Meteor.Layout();
					Cards.mainRegion.show(meteorLayout);

					var cardCollection = new Cards.Entities.CardCollection([], { setId: set.get("id") });
					
					cardCollection.fetch({
						success: function(){
							var pitchView = new Cards.Game.Meteor.Pitch.PitchView({ collection: cardCollection });
							meteorLayout.pitchRegion.show(pitchView);

							var sideBarView = new Cards.Game.Meteor.SideBar.SideBarView();
							meteorLayout.sideBarRegion.show(sideBarView);
						},
						error: function(){

						}
					});

				},
				error: function(){
					console.log("error");
				}
			});
		}
	}
});