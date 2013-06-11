Cards.View = Backbone.View.extend({
	render: function(){
		var data = {};
		if(this.model) 
			data = this.model.toJSON();


		var template = $(this.template).html();
		var compiled = _.template(template, data);
		this.$el.html(compiled);
		return this;
	}
});

Cards.ListView = Backbone.View.extend({
	initialize: function(){
		this.collection.bind("reset", this.render, this);
		this.collection.bind("add", this.render, this);
		this.collection.bind("remove", this.render, this);
	},
	render: function(){
		var that = this;
		var els = [];
		this.collection.each(function(item){
			var itemView = new that.ItemView({model: item});
			els.push(itemView.render().el);
		});

		this.$el.html(els);
		return this;
	}
});

Cards.Layout = Backbone.View.extend({
	render: function(){
		//empty the el
		this.$el.empty();

		var template = $(this.template).html();
		this.$el.append(_.template(template));

		var that = this;

		_.each(that.regions, function(selector, name){
			that[name] = that.$(selector);
		});

		if(that.layoutReady) that.layoutReady();

		return that;
	}
});

Cards.AppLayout = Backbone.View.extend({
	renderNavigation: function() {

	},
	renderDetails: function(detailView) {
		//pass the region in on init
		this.$(this.options.detailRegion).empty();
		detailView.render();
		this.$(this.options.detailRegion).append(detailView.el);
	}
});