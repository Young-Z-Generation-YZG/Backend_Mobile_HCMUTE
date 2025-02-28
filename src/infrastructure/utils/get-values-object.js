const _ = require('lodash');

const getValuesOfObject = ({ obj = {}, fields = [] }) => {
   return _.pick(obj, fields);
};

module.exports = { getValuesOfObject };
