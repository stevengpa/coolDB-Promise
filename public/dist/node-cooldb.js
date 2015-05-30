var cuid        = require('cuid'),
    clone       = require('clone'),
    pPolyfill   = require('es6-promise').polyfill(),
    Promise     = require('es6-promise').Promise;

cooldb = function cooldb() {
    
    var cdb = [];
    var changeFeedCB = undefined;
        
    updateProps : function updateProps(source, dest) {

        return new Promise(function(resolve, reject){
            
            try {
                // Clone before changes
                var currentDest = clone(dest);
                // Make changes
                for (var key in source) {

                    if(dest.hasOwnProperty(key)){
                        if (key != 'cuid')
                            dest[key] = source[key];
                    }

                }
                // Clone after changes
                var updatedDest = clone(dest);

                resolve({ before: currentDest, after: updatedDest });
                
            } catch (err) {
                var msg = (err.hasOwnProperty('message')) ? err.message : err;
                reject(new Error( msg ));
            }
            
        });
        
	}
    
    return {
        
        changeFeed: function changeFeed(fn) {
            
            // Validate it is a function
            if (typeof fn === 'function') { 
                changeFeedCB = fn; 
            } else {
                throw 'Invalid changeFeed function.';
            }
                
		},
        
        get: function get(params) {
            
            return new Promise(function(resolve, reject) {
                
                try {
                    // >> Validations <<

                    // default param array
                    params  = params || {};
                    var key   = null,
                        value = null;

                    // item key prop
                    if (!params.hasOwnProperty('key'))
                        throw 'Key => [key] was not found';
                    else {
                        if (params.hasOwnProperty('key')) key = params.key;
                    }

                    // item value prop
                    if (!params.hasOwnProperty('value') )
                        throw 'Key => [value] was not found';
                    else {
                        if (params.hasOwnProperty('value')) value = params.value;
                    }

                    var itemFound = cdb.filter(function(item){ return item[key] == value; });
                    var result = {
                        items: itemFound,
                        count: itemFound.length
                    };

                    resolve(result);
                    
                } catch (err) {
                    var msg = (err.hasOwnProperty('message')) ? err.message : err;
                    reject(new Error( msg ));
                }
                
            });
            
        },
        
        add: function add(params) {
            
            return new Promise(function(resolve, reject) {
                
                try {
                    // >> Validations <<

                    // default param array
                    params  = params || {};

                    // item key prop
                    if (!params.hasOwnProperty('item'))
                        throw 'Key => [item] was not found';

                    // add
                    if (!Array.isArray(params.item)) {
                        //>> add Object
                        if (!params.item.hasOwnProperty('cuid')) params.item.cuid = cuid();
                        // Added
                        cdb.push(clone(params.item));
                        // Change Feed
                        if (changeFeedCB != undefined) 
                        { changeFeedCB({ old: null, new: clone(params.item), action: 'Inserted' }); }
                        // Resolve
                        resolve({ old: null, new: clone(params.item), action: 'Inserted' });

                    } else if (Array.isArray(params.item)){
                        //>> Record Changes
                        var newItems = [];
                        //>> add Array
                        params.item.forEach(function(item) {
                            if (!item.hasOwnProperty('cuid')) item.cuid = cuid();
                            // Added
                            cdb.push(clone(item));
                            newItems.push(clone(item));
                            // Change Feed
                            if (changeFeedCB != undefined) 
                            { changeFeedCB({ old: null, new: clone(item), action: 'Inserted' }); }
                        });
                        // Resolve
                        resolve({ old: null, new: clone(newItems), action: 'Inserted' });

                    } else {
                        throw 'item parameter should correspond to an Object or Array.';
                    }
                    
                } catch (err) {
                    var msg = (err.hasOwnProperty('message')) ? err.message : err;
                    reject(new Error( msg ));
                }
                
            });
        },
        
        del: function del(params) {
            // >> Validations <<
            var $this = this;
            
            return new Promise(function(resolve, reject) {
                try {
                    // default param array
                    params  = params || {};

                    var key   = null,
                        value = null;

                    // item key prop
                    if (!params.hasOwnProperty('key'))
                        throw 'Key => [key] was not found';
                    else {
                        if (params.hasOwnProperty('key')) key = params.key;
                    }

                    // item value prop
                    if (!params.hasOwnProperty('value') )
                        throw 'Key => [value] was not found';
                    else {
                        if (params.hasOwnProperty('value')) value = params.value;
                    }

                    $this.get({ key: key, value: value })
                        .then(function(itemsFound){
                    
                            for (i = 0; i < itemsFound.count; i++) {

                                var item    = cdb.filter(function(item){ return item[key] == value; });
                                var index   = cdb.map(function(item){ return item[key]; }).indexOf(value);

                                if (index >= 0) {
                                    cdb.splice(index, 1); 
                                }
                                
                                var itemDeleted = (Array.isArray(item)) ? item[0] : item;

                                // Change Feed
                                if (changeFeedCB != undefined)
                                { changeFeedCB({ old: clone(itemDeleted), new: null, action: 'Deleted' }); }
                                // Resolve
                                resolve({ old: clone(itemDeleted), new: null, action: 'Deleted' });
                            }
                        
                        })
                        .catch(function(err) { throw err; } );
                    

                } catch (err) {
                    var msg = (err.hasOwnProperty('message')) ? err.message : err;
                    reject(new Error( msg ));
                }
                
            });
            
        },
        
        db: function db() {
            
            return new Promise(function(resolve, reject) {
                try {
                    resolve(cdb);
                } catch (err) {
                    var msg = (err.hasOwnProperty('message')) ? err.message : err;
                    reject(new Error( msg ));
                }
            });
            
        },
        
        clone: function clone() {
            return new Promise(function(resolve, reject) {
                try {
                    resolve(clone(cdb));
                } catch (err) {
                    var msg = (err.hasOwnProperty('message')) ? err.message : err;
                    reject(new Error( msg ));
                }
            });
        },
        
        clean: function clean() {
            
            return new Promise(function(resolve, reject) {
                try {
                    cdb = [];
                    // Change Feed
                    if (changeFeedCB != undefined) 
                    { changeFeedCB({ old: null, new: null, action: 'Cleaned' }); }
                    // Resolve
                    resolve({ old: null, new: null, action: 'Cleaned' });
                } catch (err) {
                    var msg = (err.hasOwnProperty('message')) ? err.message : err;
                    reject(new Error( msg ));
                }
            });
        
        },
        
        first: function first(params) {
            
            return new Promise(function(resolve, reject) {
                try {
                    // >> Validations <<

                    // default param array
                    params  = params || {};

                    var key   = null,
                        value = null;

                    // item key prop
                    if (!params.hasOwnProperty('key'))
                        throw 'Key => [key] was not found';
                    else {
                        if (params.hasOwnProperty('key')) key = params.key;
                    }

                    // item value prop
                    if (!params.hasOwnProperty('value') )
                        throw 'Key => [value] was not found';
                    else {
                        if (params.hasOwnProperty('value')) value = params.value;
                    }

                    var itemFound = cdb.filter(function(item){ return item[key] == value; });
                    var result = {
                        item: (itemFound.length > 0) ? itemFound[0] : null,
                        count: itemFound.length
                    };

                    resolve(clone(result));
                    
                } catch (err) {
                    var msg = (err.hasOwnProperty('message')) ? err.message : err;
                    reject(new Error( msg ));
                }
                
            });
            
        },
        
        update: function update(params) {
            
            var $this = this;
            
            return new Promise(function(resolve, reject) {
                try {
                    // >> Validations <<
                    
                    // default param array
                    params  = params || {};

                    var key   = null,
                        value = null;

                    // item key prop
                    if (!params.hasOwnProperty('key'))
                        throw 'Key => [key] was not found';
                    else {
                        if (params.hasOwnProperty('key')) key = params.key;
                    }

                    // item value prop
                    if (!params.hasOwnProperty('value') )
                        throw 'Key => [value] was not found';
                    else {
                        if (params.hasOwnProperty('value')) value = params.value;
                    }

                    // item key prop
                    if (!params.hasOwnProperty('item'))
                        throw 'Key => [item] was not found';
                    
                    var itemsUpdated = [];
                    
                    $this.get({ key: key, value: value})
                        .then(function(itemsFound) {
                            console.log(itemsFound);
                            itemsFound.items.forEach(function(dbItem){
                                    
                                $this.updateProps(params.item, dbItem)
                                    .then(function(result){
                                        console.log(dbItem);
                                        console.log(result);
                                        // Change Feed
                                        if (changeFeedCB != undefined) 
                                        { changeFeedCB({ old: clone(result.before), new: clone(result.after), action: 'Updated' }); }
                                        // Append to Updated Items
                                        itemsUpdated.push({ old: clone(result.before), new: clone(result.after), action: 'Updated' });
                                    })
                                    .catch(function(err) { throw err; });

                            });
                        
                        })
                        .catch(function(err) { throw err; });
                    
                    // Resolve
                    resolve(clone(itemsUpdated));

                } catch (err) {
                    var msg = (err.hasOwnProperty('message')) ? err.message : err;
                    reject(new Error( msg ));
                }
                
            });
        
        }
        
    };
    
};

module.exports = cooldb;