import { Request, Response } from "express";
import { validationResult } from "express-validator";
import routes from "../routes";
import { Video } from "../models/Video";
import { MulterOutFile } from "multer-blob-storage";

export const home = async (req: Request, res: Response) => {
    try {
        const videos = await Video.find().sort({ _id: -1 });
        res.render("home", { title: "Home", videos });
    } catch (err) {
        console.log(err);
        res.render("home", { title: "Home", videos: [] });
    }
};

export const search = async (req: Request, res: Response) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        req.flash(
            "error",
            errors
                .array()
                .map(e => e.msg)
                .join("<br/>")
        );
        return res.redirect(routes.index);
    }

    const keywords: string = req.query.keywords;

    try {
        const videos = await Video.find({
            title: { $regex: keywords, $options: "i" }
        }).sort({ _id: -1 });
        res.render("search", { title: "Search", keywords, videos });
    } catch (err) {
        console.log(err);
        res.redirect(routes.index);
    }
};

export const getUpload = (req: Request, res: Response) => {
    res.render("videos/upload", { title: "Upload" });
};

export const postUpload = async (req: Request, res: Response) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        req.flash(
            "error",
            errors
                .array()
                .map(e => e.msg)
                .join("<br/>")
        );
        return res.redirect(routes.videos + routes.upload);
    }

    const title: string = req.body.title;
    const description: string = req.body.description;
    const file = req.file as MulterOutFile;

    if (!file) {
        req.flash("error", "Only video files are allowed");
        return res.redirect(routes.videos + routes.upload);
    }

    try {
        const newVideo = await new Video({
            src: file.url.split("?")[0],
            title,
            description,
            creator: req.user.id
        }).save();

        req.user.videos.push(newVideo.id);
        await req.user.save();
        req.flash("success", "New video has been uploaded.");
        res.redirect(routes.videos + routes.videoDetail(newVideo.id));
    } catch (err) {
        console.log(err);
        res.redirect(routes.videos + routes.upload);
    }
};

export const detail = async (req: Request, res: Response) => {
    try {
        const video = await Video.findById(req.params.id).populate("creator");
        res.render("videos/detail", { title: video.title, video });
    } catch (err) {
        console.log(err);
        res.redirect(routes.index);
    }
};

export const getEdit = async (req: Request, res: Response) => {
    const videoId = req.params.id;

    try {
        const video = await Video.findById(videoId);
        if (video.creator.toString() !== req.user.id) {
            return res.redirect(routes.videos + routes.videoDetail(videoId));
        }

        res.render("videos/edit", { title: `Edit ${video.title}`, video });
    } catch (err) {
        console.log(err);
        res.redirect(routes.videos + routes.videoDetail(videoId));
    }
};

export const postEdit = async (req: Request, res: Response) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        req.flash(
            "error",
            errors
                .array()
                .map(e => e.msg)
                .join("<br/>")
        );
        return res.redirect(routes.videos + routes.editVideo(req.params.id));
    }

    const videoId = req.params.id;
    const video = await Video.findById(videoId);

    if (video.creator.toString() !== req.user.id) {
        return res.redirect(routes.videos + routes.editVideo(videoId));
    }

    const title: string = req.body.title;
    const description: string = req.body.description;

    try {
        const video = await Video.findByIdAndUpdate(videoId, {
            title,
            description
        });
        req.flash("success", "Video information has been updated.");
        res.redirect(routes.videos + routes.videoDetail(video.id));
    } catch (err) {
        console.log(err);
        res.redirect(routes.videos + routes.editVideo(videoId));
    }
};

export const remove = async (req: Request, res: Response) => {
    const videoId = req.params.id;

    try {
        const video = await Video.findById(videoId);
        if (video.creator.toString() !== req.user.id) {
            return res.redirect(routes.videos + routes.videoDetail(videoId));
        }

        await Video.findByIdAndDelete(videoId);
        req.flash("success", "Video has been deleted.");
        res.redirect(routes.index);
    } catch (err) {
        console.log(err);
        res.redirect(routes.videos + routes.videoDetail(videoId));
    }
};

export const updateView = async (req: Request, res: Response) => {
    try {
        const video = await Video.findById(req.params.id);
        video.views++;
        await video.save();
        res.sendStatus(200);
    } catch (err) {
        console.log(err);
        res.sendStatus(400);
    }
};
