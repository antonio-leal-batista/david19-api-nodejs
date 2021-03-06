import mongoose from "mongoose";
import countryModel from "./model/country.js";
import userModel from "./model/user.js";
import {
	getAgeRanges,
	getCountryPoints,
	getCountryRank,
	getPipeline,
	getPipeline2,
	getPointsRanking,
	getUserRankPosition,
	getUserRankPositionCountry
} from "./util/queriesv2.js";

export default class MongoDAO {

	constructor() {
		mongoose.connect( process.env.MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true } );

		const userSchema = mongoose.Schema( userModel );
		userSchema.index( { 'location': '2d' } );
		userSchema.index( { 'geohash': 'hashed' } );

		const countrySchema = mongoose.Schema( countryModel );
		countrySchema.index( { 'geometry': '2dsphere' } );

		this.models = {
			'user': mongoose.model( 'user', userSchema ),
			'country': mongoose.model( 'country', countrySchema )
		};
	}

	getCountry( location ) {
		return this.models['country'].findOne( {
			geometry: {
				$geoIntersects: {
					$geometry: {
						"type": "Polygon",
						"coordinates": [[
							[location[0] - 0.01, location[1] - 0.01],
							[location[0] - 0.01, location[1] + 0.01],
							[location[0] + 0.01, location[1] + 0.01],
							[location[0] + 0.01, location[1] - 0.01],
							[location[0] - 0.01, location[1] - 0.01]
						]]
					}
				}
			}
		} );
	}

	getUser( subjectId ) {
		return this.models['user'].findOne( { subjectId } );
	}

	async updateUnknownUserCountry() {
		const users = await this.models['user'].find( { country: "" } );
		for( const user of users ) {
			const location = ( await this.getCountry( user.location ) );
			if( location ) {
				const values = location.properties.iso_3166_2.split( '-' );
				user.country = values[0];
				user.region = values[1];
				user.save();
			}
		}
	}

	newUser( subjectId, gender, age, geohash, coordinates, iso3166_2 ) {
		return new this.models['user']( {
			age,
			gender,
			geohash,
			subjectId,
			location: coordinates,
			country: iso3166_2[0],
			region: iso3166_2[1]
		} );
	}

	getClusters( box, factor, filter ) {
		return this.models['user'].aggregate( getPipeline( box, factor, filter ) );
	}

	getQuery( box, factor, filter ) {
		return this.models['user'].aggregate( getPipeline2( box, factor, filter ) );
	}

	getAgeRanges( status, filter ) {
		return this.models['user'].aggregate( getAgeRanges( status, filter ) );
	}

	getCountryRanking() {
		return this.models['user'].aggregate( getCountryRank() );
	}

	getCountryPoints() {
		return this.models['user'].aggregate( getCountryPoints() );
	}

	getPointsRanking() {
		return this.models['user'].aggregate( getPointsRanking() );
	}

	getUserRankPosition( subjectId ) {
		return this.models['user'].aggregate( getUserRankPosition( subjectId ) );
	}

	getUserRankPositionCountry( country, subjectId ) {
		return this.models['user'].aggregate( getUserRankPositionCountry( country, subjectId ) );
	}

}