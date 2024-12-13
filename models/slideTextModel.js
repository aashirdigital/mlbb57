const mongoose = require("mongoose");

const sliderSchema = new mongoose.Schema(
  {
    text: {
      type: String,
    },
  },
  { timestamps: true }
);

sliderSchema.statics.saveSingleDocument = async function (data) {
  let document = await this.findOne();
  if (document) {
    document.text = data.text;
    return document.save();
  } else {
    return this.create(data);
  }
};

const SlideTextModel = mongoose.model("slide", sliderSchema);
module.exports = SlideTextModel;
