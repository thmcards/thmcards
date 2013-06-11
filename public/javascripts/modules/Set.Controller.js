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
					console.log(set.get("id"));

					var detailsLayout = new Cards.Set.Details.Layout();
					Cards.mainRegion.show(detailsLayout);

					


					var cardCollection = new Cards.Entities.CardCollection([], { setId: set.get("id") });
					
					cardCollection.fetch({
						success: function(){
							console.log(cardCollection);
							var detailsView = new Cards.Set.Details.DetailsView({ collection: cardCollection });
							detailsLayout.detailsRegion.show(detailsView);
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