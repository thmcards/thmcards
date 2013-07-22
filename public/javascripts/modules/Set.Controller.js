Cards.module('Set', function(Set, App){
	Set.Controller = {
		showListLayout: function(){
			var setLayout = new Cards.Set.List.Layout();
			Cards.mainRegion.show(setLayout);

			var sets = new Cards.Entities.SetCollection();
			var listView = new Cards.Set.List.ListView({ collection: sets });
			setLayout.listRegion.show(listView);

			var sideBarView = new Cards.Set.List.SideBar.SideBarView({ collection: sets });
			setLayout.sideBarRegion.show(sideBarView);

		},
		showDetailsLayout: function(name, id){
			var set = new Cards.Entities.Set({id: id});
			set.fetch({
				success: function(){
					var detailsLayout = new Cards.Set.Details.Layout();
					Cards.mainRegion.show(detailsLayout);

					var cardCollection = new Cards.Entities.CardCollection([], { setId: set.get("id") });
					
					cardCollection.fetch({
						success: function(){
							var detailsView = new Cards.Set.Details.DetailsView({ collection: cardCollection });
							detailsLayout.detailsRegion.show(detailsView);
						},
						error: function(){

						}
					});

					
					var sideBarView = new Cards.Set.Details.SideBar.SideBarView({ model: set});
					detailsLayout.sideBarRegion.show(sideBarView);

					var constrolsView = new Cards.Set.Details.SideBar.ControlsView({ model: set});
					detailsLayout.controlsRegion.show(constrolsView);
				},
				error: function(){
					console.log("error");
				}
			});
		},
		showDetailsNewCardLayout: function(name, id){
			var set = new Cards.Entities.Set({id: id});

			set.fetch({
				success: function(){
					console.log(set.get("id"));

					var newCardLayout = new Cards.Set.Details.NewCardLayout();
					Cards.mainRegion.show(newCardLayout);

					var newCardView = new Cards.Set.Details.NewCardView({ model: set });
					newCardLayout.detailsRegion.show(newCardView);

				},
				error: function(){
					console.log("error");
				}
			});
		}
	}
});