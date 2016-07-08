#Read in raw CSV
#air <- read.csv("/home/alec/Projects/Brookings/advanced-industries/data/allData.csv")
#saveRDS(air, file="/home/alec/Projects/Brookings/advanced-industries/data/allData.RDS")

air <- readRDS(file="/home/alec/Projects/Brookings/advanced-industries/data/allData.RDS")

library(ggplot2)
library(reshape2)
library(plyr)

airmelt <- melt(air, id.vars = c("FIP", "naics", "n4Title.x", "ai", "aiType"), measure.vars = paste0("emp",2000:2015), variable.name="year")
airmelt$year <- as.numeric(sub("emp", "", airmelt$year))
aitot <- airmelt[airmelt$n4Title.x=="Advanced Industries Total", ]

aitotindex <- ddply(aitot, .variables="FIP", .fun=function(piece){
  y2k <- piece[piece$year == 2000, "value"]
  piece$idx <- (piece$value/y2k)*100
  return(piece)
  
})

plt <- ggplot(aitotindex)
plt + geom_line(aes(x=year, y=idx, group=FIP), alpha=0.2)
