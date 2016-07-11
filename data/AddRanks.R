ai <- read.csv("/home/alec/Projects/Brookings/advanced-industries/data/AIData.csv", stringsAsFactors = FALSE)

ai100 <- ai[ai$TOP100==1, ]

#add in ranks to AI data
rnkit <- function(df, var){
  df[[paste0("RANK100_", var)]] <- rank(0-df[,var], ties.method="min")
  return(df)
}

ai100 <- rnkit(ai100, "AIEMP2015")
ai100 <- rnkit(ai100, "AIGDP2015")
ai100 <- rnkit(ai100, "AIEMPSHARE2015")
ai100 <- rnkit(ai100, "AIGDPSHARE2015")

ai100 <- rnkit(ai100, "AIEMP_GR_2010_2013")
ai100 <- rnkit(ai100, "AIEMP_GR_2010_2015")
ai100 <- rnkit(ai100, "AIEMP_GR_2013_2015")

ai100 <- rnkit(ai100, "AIGDP_GR_2010_2013")
ai100 <- rnkit(ai100, "AIGDP_GR_2010_2015")
ai100 <- rnkit(ai100, "AIGDP_GR_2013_2015")

write.csv(ai100, file="/home/alec/Projects/Brookings/advanced-industries/data/AI100Data.csv", row.names=FALSE)
