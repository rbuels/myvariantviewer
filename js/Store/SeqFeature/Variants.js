define([
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/_base/lang',
            'dojo/request',
            'JBrowse/Store/SeqFeature',
            'JBrowse/Model/SimpleFeature',
            'JBrowse/Util'
       ],
       function(
            declare,
            array,
            lang,
            request,
            SeqFeatureStore,
            SimpleFeature,
            Util
       ) {

var dojof = Util.dojof;

return declare( SeqFeatureStore, {

    constructor: function( args ) {
        this.features={};
        // perform any steps to initialize your new store.  
    },

    getFeatures: function( query, featureCallback, finishCallback, errorCallback ) {
        var thisB = this;
        var url = this.resolveUrl(
            this.config.urlTemplate, { refseq: query.ref, start: query.start, end: query.end }
        );
        
        if(this.features[query.start+"_"+query.end]) {
            array.forEach(this.features[query.start+"_"+query.end], function(feature) {
                featureCallback(feature);
            });
            finishCallback();
            return;
        }
        else {
            this.features[query.start+"_"+query.end]=[];
        }
        request( url,
                 { handleAs: 'json' }
               ).then(
                   function( featuredata ) {
                       array.forEach( featuredata.hits, function(f) {
                           var start = +f._id.match(/chr.*:g.([0-9]+)/)[1];
                           var feature = new SimpleFeature({
                                   id: f._id,
                                   data: {
                                       start: start,
                                       end: start+1,
                                       id: f._id
                                   }
                               });

                           var process=function(str,data,plus) {
                               if(!data) return;

                               if(str.match(/snpeff/)){
                                  if(lang.isArray(data['ann'])) {
                                      array.forEach(data['ann'],function(fm,i) { process(str+'_'+i,fm,i); });
                                      return;
                                  }
                                  else if(data['ann']) {
                                      delete data['ann'].cds;
                                      delete data['ann'].cdna;
                                      delete data['ann'].protein;
                                  }
                                  else {
                                      delete data.cds; // sub-sub-objects, not super informative
                                      delete data.cdna;
                                      delete data.protein;
                                  }
                              }
                              if(str.match(/cadd/)) {
                                  if(data['encode']) {
                                      process(str+'_encode',data['encode']);
                                  }
                                  delete data['encode'];
                              }
                              if(str.match(/grasp/)) {
                                  if(lang.isArray(data['publication'])) {
                                      array.forEach(data['publication'],function(fm,i) { process(str+'_publication'+i,fm); });
                                  }
                                  delete data['publication'];
                              }
                              
                              feature.data[str+"_attrs"+(plus||"")]={};
                              var valkeys=array.filter( dojof.keys(data), function(key) {
                                  return typeof data[key]!='object';
                              });

                              var objkeys=array.filter( dojof.keys(data), function(key) {
                                  return typeof data[key]=='object' && key!='gene';
                              });

                              

                              array.forEach( valkeys, function(key) {
                                  feature.data[str+"_attrs"+(plus||"")][key]=data[key];
                              });
                              array.forEach( objkeys, function(key) {
                                  feature.data[str+"_"+key+(plus||"")]=data[key];
                              });
                           }
                           
                           process('cadd',f['cadd']);
                           //process('cosmic',f['cosmic']);
                           //process('dbnsfp',f['dbnsfp']);
                           process('dbsnp',f['dbsnp']);
                           process('evs',f['evs']);
                           process('exac',f['exac']);
                           process('mutdb',f['mutdb']);
                           process('wellderly',f['wellderly']);
                           process('snpedia',f['snpedia']);
                           process('snpeff',f['snpeff']);
                           process('vcf',f['vcf']);
                           process('grasp',f['grasp']);
                           process('gwascatalog',f['gwascatalog']);
                           process('docm',f['docm']);
                           process('emvclass',f['emvclass']);
                           process('clinvar',f['clinvar']);
                           

                           thisB.features[query.start+"_"+query.end].push(feature);

                           featureCallback( feature );
                       });

                       // call the endCallback when all the features
                       // have been processed
                       finishCallback();
                   },

                   errorCallback
               );

    }
});
});
