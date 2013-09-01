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
							var detailsView = new Cards.Set.Details.DetailsView({ collection: cardCollection, model: set });
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
		showLearnLayout: function(name, id){
			var set = new Cards.Entities.Set({id: id});
			set.fetch({
				success: function(){
					var learnLayout = new Cards.Set.Learn.Layout();
					Cards.mainRegion.show(learnLayout);

					var personalCollection = new Cards.Entities.PersonalCollection([], { setId: set.get("id") });
					
					personalCollection.fetch({
						success: function(){
							// copy mit filterfunktion der original liste, die wird angezeigt
							var filteredCollection = FilteredCollection(personalCollection, { setId: set.get("id") });
							
							var learnView = new Cards.Set.Learn.DetailsView({ collection: filteredCollection });
							learnLayout.learnRegion.show(learnView);


							var controlsView = new Cards.Set.Learn.SideBar.ControlsView({ collection: personalCollection });
							learnLayout.controlsRegion.show(controlsView);

							var sideBarView = new Cards.Set.Learn.SideBar.SideBarView({ model: set});
							learnLayout.sideBarRegion.show(sideBarView);
						},
						error: function(){

						}
					});
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

function FilteredCollection(collection, options){
    var filtered = new collection.constructor(collection.models, options);
        
    filtered.filter = function(criteria){
    	console.log(criteria);
        var items;
        if (criteria){
            items = _.filter(collection.models, function(model) {
            	var pcard;
				if(_.isArray(model.get("persCard"))) {
					pcard = _.first(model.get("persCard"));
				} else {
					pcard = model.get("persCard");
				}
				if (pcard) {
           			return pcard.value.box == criteria;
           		}
           		if (!pcard && criteria == 1){           			
           			return true;
           		} 
           		else return false;
			});
        } else {
            items = collection.models;
        }
        filtered.reset(items);
    };
    collection.on("change", function(model){
    	console.log("change");
        filtered.reset(collection.models);
    });
    collection.on("reset", function(){
    	console.log("reset");
        filtered.reset(collection.models);
    });          
        
    return filtered;
}